import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Функция: Вселенная, в которую пускают агента
 *
 * Как человек, который вычистил повторы руками,
 * я хочу подключить агента одной строкой и одним разрешением,
 * чтобы он делал ту же работу в моей команде — и только в моей.
 */

const API = `http://localhost:${process.env.E2E_API_PORT ?? "3100"}`;
const WEB = `http://localhost:${process.env.E2E_WEB_PORT ?? "5273"}`;
const CALLBACK = `${WEB}/agent-callback`;

const READ = "knife:read";
const WRITE = "knife:write";

const SHEET = [
  "A refund request must be submitted within 48 hours of checkout.",
  "Refund requests are submitted within 48 hours of the checkout.",
  "Peacocks in the orangery are counted at dawn by the night auditor.",
];

/** Агент представляется сам: человек не заводит его руками нигде. */
const registerAgent = async (
  request: APIRequestContext,
  scope: string = READ,
): Promise<string> => {
  const response = await request.post(`${API}/register`, {
    data: {
      client_name: "An agent under test",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [CALLBACK],
      response_types: ["code"],
      scope,
    },
  });

  expect(response.status()).toBe(201);
  return ((await response.json()) as { client_id: string }).client_id;
};

const pkce = (): { challenge: string; verifier: string } => {
  const verifier = randomBytes(32).toString("base64url");
  return {
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    verifier,
  };
};

/** Проходит разрешение в браузере и возвращает код, как это делает агент. */
const codeThroughBrowser = async (
  page: Page,
  clientId: string,
  challenge: string,
  scope: string = READ,
): Promise<string> => {
  const query = new URLSearchParams({
    client_id: clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: CALLBACK,
    resource: `${API}/mcp`,
    response_type: "code",
    scope,
    state: "a-state",
  });

  await page.goto(`${API}/authorize?${query.toString()}`);
  await expect(page.getByRole("heading")).toContainText(
    "wants into your universe",
  );

  await page.getByRole("button", { name: "Allow" }).click();
  await page.waitForURL(`${CALLBACK}**`);

  const code = new URL(page.url()).searchParams.get("code");
  expect(code).toBeTruthy();
  return code ?? "";
};

const tokenFor = async (
  request: APIRequestContext,
  clientId: string,
  code: string,
  verifier: string,
  scope: string = READ,
): Promise<string> => {
  const response = await request.post(`${API}/token`, {
    form: {
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: CALLBACK,
      resource: `${API}/mcp`,
    },
  });

  expect(response.status()).toBe(200);
  const tokens = (await response.json()) as {
    access_token: string;
    scope: string;
  };
  expect(tokens.scope).toBe(scope);
  return tokens.access_token;
};

/** Регистрация, разрешение в браузере и обмен кода — всё, что нужно агенту. */
const connectAgent = async (
  page: Page,
  request: APIRequestContext,
  scope: string = READ,
): Promise<string> => {
  const clientId = await registerAgent(request, scope);
  const { challenge, verifier } = pkce();
  const code = await codeThroughBrowser(page, clientId, challenge, scope);
  return tokenFor(request, clientId, code, verifier, scope);
};

/** Вселенная, засеянная простынёй, как её завёл бы человек. */
const universeNamed = async (
  request: APIRequestContext,
  name: string,
): Promise<string> => {
  const project = await request.post(`${API}/api/projects`, { data: { name } });
  const { id } = (await project.json()) as { id: string };
  await request.post(`${API}/api/projects/${id}/chunks/bulk`, {
    data: { texts: SHEET },
  });
  return id;
};

const chunkNamed = async (
  request: APIRequestContext,
  projectId: string,
  text: string,
): Promise<{ id: string; text: string }> => {
  const response = await request.post(
    `${API}/api/projects/${projectId}/chunks`,
    { data: { text } },
  );
  return (await response.json()) as { id: string; text: string };
};

const chunksOf = async (
  request: APIRequestContext,
  projectId: string,
): Promise<Array<{ id: string; text: string }>> => {
  const response = await request.get(`${API}/api/projects/${projectId}/chunks`);
  return (await response.json()) as Array<{ id: string; text: string }>;
};

const askAgent = async (
  request: APIRequestContext,
  pass: string,
  body: object,
): Promise<Record<string, unknown>> => {
  const response = await request.post(`${API}/mcp`, {
    data: body,
    headers: {
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${pass}`,
    },
  });
  return (await response.json()) as Record<string, unknown>;
};

const said = (answer: Record<string, unknown>): string =>
  (answer as { result?: { content?: Array<{ text: string }> } }).result
    ?.content?.[0]?.text ?? JSON.stringify(answer);

test.describe("Вселенная, в которую пускают агента", () => {
  test("Подключаю агента одним разрешением и он видит мои повторы", async ({
    page,
    request,
  }) => {
    const name = `agents-${process.pid}-${Date.now()}`;
    await universeNamed(request, name);
    const pass = await connectAgent(page, request);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { level: "almost", project: name },
        name: "find_duplicates",
      },
    });

    expect(said(answer)).toContain(`Project "${name}"`);
    expect(said(answer)).toContain("refund");
  });

  /**
   * Требование: показанное человеку и показанное агенту не расходится.
   * Куски приходят под теми же id, что видит браузер.
   */
  test("Агент читает мою вселенную теми же кусками, что и я", async ({
    page,
    request,
  }) => {
    const name = `agents-read-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const mine = await chunksOf(request, projectId);
    const pass = await connectAgent(page, request);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: { arguments: { project: name }, name: "list_chunks" },
    });

    for (const chunk of mine) {
      expect(said(answer)).toContain(chunk.id);
      expect(said(answer)).toContain(chunk.text);
    }
  });

  test("Агент, которому доверили удаление, вычищает повтор", async ({
    page,
    request,
  }) => {
    const name = `agents-write-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const [doomed] = await chunksOf(request, projectId);
    const pass = await connectAgent(page, request, `${READ} ${WRITE}`);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { id: doomed?.id, project: name },
        name: "delete_chunk",
      },
    });

    expect(said(answer)).toContain("cannot be undone");
    expect(said(answer)).toContain(doomed?.text ?? "");

    const left = await chunksOf(request, projectId);
    expect(left).toHaveLength(SHEET.length - 1);
    expect(left.map((chunk) => chunk.id)).not.toContain(doomed?.id);
  });

  /** Требование: чтение и удаление разрешаются порознь. */
  test("Агенту, которому доверили только чтение, удалять нечем", async ({
    page,
    request,
  }) => {
    const name = `agents-readonly-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const [safe] = await chunksOf(request, projectId);
    const pass = await connectAgent(page, request);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { id: safe?.id, project: name },
        name: "delete_chunk",
      },
    });

    expect(said(answer)).toContain("does not allow knife:write");
    expect(await chunksOf(request, projectId)).toHaveLength(SHEET.length);
  });

  /** Требование: агент доливает текст той же нарезкой, что и браузер. */
  test("Агент доливает простыню, и она растворяется кусками", async ({
    page,
    request,
  }) => {
    const name = `agents-add-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const pass = await connectAgent(page, request, `${READ} ${WRITE}`);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: {
          project: name,
          text: "The orangery is locked at midnight. Keys hang by the desk.",
        },
        name: "add_chunks",
      },
    });

    expect(said(answer)).toContain(`Added 2 chunks to "${name}"`);
    const now = await chunksOf(request, projectId);
    expect(now).toHaveLength(SHEET.length + 2);
    expect(now.map((chunk) => chunk.text)).toContain(
      "The orangery is locked at midnight.",
    );
  });

  /**
   * Требование: вселенная открыта агенту так же, как мне — те же слова,
   * те же куски под теми же id. Слово приходит в любой форме: формы одного
   * слова — одно слово.
   */
  test("Агент ходит от слова к куску", async ({ page, request }) => {
    const name = `agents-words-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const mine = await chunksOf(request, projectId);
    const aboutRefunds = mine.filter((chunk) => /refund/i.test(chunk.text));
    const pass = await connectAgent(page, request);

    const words = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: { arguments: { project: name }, name: "list_words" },
    });
    expect(said(words)).toContain(`holds ${SHEET.length} chunks`);
    expect(said(words)).toContain("refund");

    const word = await askAgent(request, pass, {
      id: 2,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { project: name, word: "refunds" },
        name: "get_word",
      },
    });
    for (const chunk of aboutRefunds) {
      expect(said(word)).toContain(chunk.id);
    }

    const first = aboutRefunds[0];
    const chunk = await askAgent(request, pass, {
      id: 3,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { id: first?.id, project: name },
        name: "get_chunk",
      },
    });
    expect(said(chunk)).toContain(first?.text ?? "");
    expect(said(chunk)).toMatch(/arrived \d{4}-\d{2}-\d{2}\./);
    /** Слово, стоящее и в соседнем куске, названо числом, а не молчанием. */
    expect(said(chunk)).toMatch(/\n {2}refund 1/);
  });

  /** Требование: ищу по обрывку слова, и это тот же расчёт, что у человека. */
  test("Агент ищет по вселенной обрывком слова", async ({ page, request }) => {
    const name = `agents-search-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const mine = await chunksOf(request, projectId);
    const orangery = mine.find((chunk) => chunk.text.includes("orangery"));
    const pass = await connectAgent(page, request);

    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { project: name, query: "orang" },
        name: "search_chunks",
      },
    });

    expect(said(answer)).toContain(orangery?.id ?? "");
    for (const chunk of mine.filter((other) => other.id !== orangery?.id)) {
      expect(said(answer)).not.toContain(chunk.id);
    }
  });

  /**
   * Требование: за прогон линтеры читают всю вселенную, и молчание сломанных
   * линтеров не выдаётся за чистый текст. Замечания нигде не оседают —
   * этот ответ и есть весь прогон.
   */
  test("Агент прогоняет линтеры по всей вселенной", async ({
    page,
    request,
  }) => {
    const name = `agents-lint-${process.pid}-${Date.now()}`;
    const projectId = await universeNamed(request, name);
    const dirty = await chunkNamed(
      request,
      projectId,
      "A very good rule is submitted by the manager.",
    );

    const health = await request.get(`${API}/api/lint/health`);
    expect(
      ((await health.json()) as { available: boolean }).available,
      "Линтеры молчат: подними контейнер — pnpm linters:up",
    ).toBe(true);

    const pass = await connectAgent(page, request);
    const answer = await askAgent(request, pass, {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: { arguments: { project: name }, name: "lint_universe" },
    });

    expect(said(answer)).toContain(
      `The linters read all ${SHEET.length + 1} chunks.`,
    );
    expect(said(answer)).toMatch(/\d+ remarks? on \d+ chunks?[.,]/);

    /** Замечания стоят под тем куском, на котором написаны, а не кучей. */
    const written = said(answer)
      .split("\n\n")
      .find((block) => block.startsWith(dirty.id));
    expect(written).toContain(dirty.text);
    expect(written).toMatch(
      /\n {2}(error|suggestion|warning) {2}\S+\/\S+ {2}\S/,
    );
  });

  test("Без разрешения дверь закрыта и говорит, куда идти", async ({
    request,
  }) => {
    const response = await request.post(`${API}/mcp`, {
      data: { id: 1, jsonrpc: "2.0", method: "tools/list" },
      headers: { accept: "application/json, text/event-stream" },
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain(
      "/.well-known/oauth-protected-resource/mcp",
    );
  });

  test("Код разрешения тратится один раз", async ({ page, request }) => {
    const clientId = await registerAgent(request);
    const { challenge, verifier } = pkce();
    const code = await codeThroughBrowser(page, clientId, challenge);

    await tokenFor(request, clientId, code, verifier);
    const again = await request.post(`${API}/token`, {
      form: {
        client_id: clientId,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK,
      },
    });

    expect(again.status()).toBe(400);
  });
});
