import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Dialect, LocalLinter } from "harper.js";
import { binary } from "harper.js/binary";

const run = promisify(execFile);
const PORT = Number(process.env.PORT ?? 8081);
const TOOL_TIMEOUT_MS = 60000;

/**
 * Harper slows down superlinearly on a long document: the whole universe in one
 * call takes minutes, the same text in batches this size takes seconds.
 */
const HARPER_BATCH = 100;

/**
 * Every chunk becomes one line of one document, so a tool runs once for the
 * whole batch and its line number maps straight back to a chunk id.
 */
const asLine = (item) => item.text.replace(/\s*\n\s*/g, " ");

const asDocument = (items) => items.map(asLine).join("\n");

const call = async (command, args, cwd) => {
  try {
    const { stdout } = await run(command, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: TOOL_TIMEOUT_MS,
    });
    return stdout;
  } catch (error) {
    // Every one of these exits non-zero when it has something to say.
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  }
};

const parse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const severityOf = (level) => {
  if (level === "error") {
    return "error";
  }
  return level === "warning" ? "warning" : "suggestion";
};

const valeFindings = async (items, cwd, file) => {
  const raw = await call(
    "vale",
    ["--config", "/app/.vale.ini", "--output=JSON", file],
    cwd,
  );
  const byFile = parse(raw, {});

  return Object.values(byFile)
    .flat()
    .map((alert) => {
      const chunk = items[alert.Line - 1];
      if (!chunk) {
        return undefined;
      }
      const [from = 1, to = 1] = alert.Span ?? [];
      return {
        chunkId: chunk.id,
        length: Math.max(1, to - from + 1),
        message: alert.Message,
        offset: Math.max(0, from - 1),
        rule: alert.Check ?? "Vale",
        severity: severityOf(alert.Severity),
        tool: "vale",
      };
    })
    .filter(Boolean);
};

const proselintFindings = async (items, cwd, file) => {
  const raw = await call("proselint", ["--json", file], cwd);
  const parsed = parse(raw, { data: { errors: [] } });
  const errors = parsed?.data?.errors ?? [];

  return errors
    .map((error) => {
      const chunk = items[error.line - 1];
      if (!chunk) {
        return undefined;
      }
      return {
        chunkId: chunk.id,
        length: Math.max(1, error.extent ?? 1),
        message: error.message,
        offset: Math.max(0, (error.column ?? 1) - 1),
        rule: error.check ?? "proselint",
        severity: severityOf(error.severity),
        tool: "proselint",
      };
    })
    .filter(Boolean);
};

const textlintFindings = async (items, cwd, file) => {
  const raw = await call(
    "textlint",
    ["--config", "/app/.textlintrc.json", "--format", "json", file],
    cwd,
  );
  const results = parse(raw, []);

  return results
    .flatMap((result) => result.messages ?? [])
    .map((message) => {
      const chunk = items[message.line - 1];
      if (!chunk) {
        return undefined;
      }
      // Only a rule that offers a fix knows how far the problem reaches; the
      // rest point at a single character and mean the word that starts there.
      const [from = 0, to = 0] = message.fix?.range ?? message.range ?? [];
      return {
        chunkId: chunk.id,
        length: Math.max(1, to - from),
        message: message.message,
        offset: Math.max(0, (message.column ?? 1) - 1),
        rule: message.ruleId ?? "textlint",
        severity: message.severity === 2 ? "error" : "warning",
        tool: "textlint",
      };
    })
    .filter(Boolean);
};

let harper;

/** One linter per process: preparing the WebAssembly costs half a second. */
const harperLinter = async () => {
  harper ??= (async () => {
    const linter = new LocalLinter({ binary, dialect: Dialect.American });
    await linter.setup();
    return linter;
  })();
  return harper;
};

const lineOffsets = (lines) => {
  const offsets = [];
  let position = 0;
  for (const line of lines) {
    offsets.push(position);
    position += line.length + 1;
  }
  return offsets;
};

/** Which line a character position falls on, by search over the line starts. */
const lineAt = (offsets, position) => {
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (offsets[middle] > position) {
      high = middle - 1;
    } else {
      low = middle;
    }
  }
  return low;
};

/** The message alone often only asks a question; the replacement answers it. */
const harperMessage = (lint) => {
  const [suggestion] = lint.suggestions();
  const replacement = suggestion?.get_replacement_text() ?? "";
  return replacement ? `${lint.message()} → ${replacement}` : lint.message();
};

const harperFindings = async (items) => {
  const linter = await harperLinter();
  const findings = [];

  for (let start = 0; start < items.length; start += HARPER_BATCH) {
    const batch = items.slice(start, start + HARPER_BATCH);
    const lines = batch.map(asLine);
    const offsets = lineOffsets(lines);
    // One batch at a time: a single linter serves the process, and handing it
    // the whole universe at once is exactly what these batches avoid.
    // oxlint-disable-next-line no-await-in-loop
    const lints = await linter.lint(lines.join("\n"), {
      language: "plaintext",
    });

    for (const lint of lints) {
      const span = lint.span();
      const line = lineAt(offsets, span.start);
      const chunk = batch[line];
      if (!chunk) {
        continue;
      }
      findings.push({
        chunkId: chunk.id,
        length: Math.max(1, span.end - span.start),
        message: harperMessage(lint),
        offset: Math.max(0, span.start - offsets[line]),
        rule: lint.lint_kind(),
        // Harper grades nothing it finds, and inventing grades for it would be
        // us writing rules rather than running them.
        severity: "warning",
        tool: "harper",
      });
    }
  }

  return findings;
};

/** The tools this service runs, and the order their findings come back in. */
const TOOLS = [
  ["harper", harperFindings],
  ["proselint", proselintFindings],
  ["textlint", textlintFindings],
  ["vale", valeFindings],
];

const lint = async (items) => {
  const cwd = await mkdtemp(path.join(tmpdir(), "knife-lint-"));
  const file = path.join(cwd, "universe.md");

  try {
    await writeFile(file, asDocument(items), "utf8");

    const runs = await Promise.allSettled(
      TOOLS.map(([, findings]) => findings(items, cwd, file)),
    );

    const tools = TOOLS.filter(
      (_, position) => runs[position].status === "fulfilled",
    ).map(([name]) => name);

    return {
      available: tools.length > 0,
      findings: runs.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      ),
      tools,
    };
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const send = (response, status, payload) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
};

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    send(response, 200, {
      available: true,
      tools: TOOLS.map(([name]) => name),
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/lint") {
    send(response, 404, { message: "not found" });
    return;
  }

  try {
    const { items } = JSON.parse(await readBody(request));
    send(response, 200, await lint(items ?? []));
  } catch (error) {
    send(response, 500, {
      available: false,
      findings: [],
      reason: error instanceof Error ? error.message : String(error),
      tools: [],
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`linters listening on :${PORT}\n`);
});
