import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const PORT = Number(process.env.PORT ?? 8081);
const TOOL_TIMEOUT_MS = 60000;

/**
 * Every chunk becomes one line of one document, so a tool runs once for the
 * whole batch and its line number maps straight back to a chunk id.
 */
const asDocument = (items) =>
  items.map((item) => item.text.replace(/\s*\n\s*/g, " ")).join("\n");

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
      return {
        chunkId: chunk.id,
        length: 1,
        message: message.message,
        offset: Math.max(0, (message.column ?? 1) - 1),
        rule: message.ruleId ?? "textlint",
        severity: message.severity === 2 ? "error" : "warning",
        tool: "textlint",
      };
    })
    .filter(Boolean);
};

const lint = async (items) => {
  const cwd = await mkdtemp(path.join(tmpdir(), "knife-lint-"));
  const file = path.join(cwd, "universe.md");

  try {
    await writeFile(file, asDocument(items), "utf8");

    const runs = await Promise.allSettled([
      valeFindings(items, cwd, file),
      proselintFindings(items, cwd, file),
      textlintFindings(items, cwd, file),
    ]);

    const tools = ["vale", "proselint", "textlint"].filter(
      (_, position) => runs[position].status === "fulfilled",
    );

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
      tools: ["vale", "proselint", "textlint"],
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
