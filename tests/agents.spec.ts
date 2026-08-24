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

const SHEET = [
  "A refund request must be submitted within 48 hours of checkout.",
  "Refund requests are submitted within 48 hours of the checkout.",
  "Peacocks in the orangery are counted at dawn by the night auditor.",
];

/** Агент представляется сам: человек не заводит его руками нигде. */
const registerAgent = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post(`${API}/register`, {
    data: {
      client_name: "An agent under test",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [CALLBACK],
      response_types: ["code"],
      scope: "knife:read",
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
): Promise<string> => {
  const query = new URLSearchParams({
    client_id: clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: CALLBACK,
    resource: `${API}/mcp`,
    response_type: "code",
    scope: "knife:read",
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
  expect(tokens.scope).toBe("knife:read");
  return tokens.access_token;
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
    const project = await request.post(`${API}/api/projects`, {
      data: { name },
    });
    const { id } = (await project.json()) as { id: string };
    await request.post(`${API}/api/projects/${id}/chunks/bulk`, {
      data: { texts: SHEET },
    });

    const clientId = await registerAgent(request);
    const { challenge, verifier } = pkce();
    const code = await codeThroughBrowser(page, clientId, challenge);
    const pass = await tokenFor(request, clientId, code, verifier);

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
