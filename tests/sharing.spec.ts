import { expect, test } from "@playwright/test";
import { API_URL, OTHER, OWNER, signedInAs } from "./people";
import type { APIRequestContext, Browser, Page } from "@playwright/test";

type StorageState = NonNullable<
  NonNullable<Parameters<Browser["newContext"]>[0]>["storageState"]
>;

/**
 * Функция: Проект мой, и я сам решаю, кого к нему позвать
 *
 * Как человек, который годами держит во вселенной свои требования,
 * я хочу, чтобы мой список проектов был только моим,
 * а к отдельному проекту я звал по адресу почты — и позванный видел
 * этот проект и ничего больше из моего.
 */

const SHEET = [
  "A refund request must be submitted within 48 hours of checkout.",
  "Peacocks in the orangery are counted at dawn by the night auditor.",
];

/** Свой проект хозяина, наполненный текстом. */
const universeOf = async (
  request: APIRequestContext,
  name: string,
): Promise<string> => {
  const created = await request.post(`${API_URL}/api/projects`, {
    data: { name },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await request.post(`${API_URL}/api/projects/${id}/chunks/bulk`, {
    data: { texts: SHEET },
  });
  return id;
};

/** Второй человек — своя сессия, свой браузер, ничего общего. */
const asOther = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({
    storageState: signedInAs(OTHER.id) as StorageState,
  });
  return context.newPage();
};

const projectsSeenBy = async (page: Page): Promise<string[]> => {
  const response = await page.request.get(`${API_URL}/api/projects`);
  const projects = (await response.json()) as Array<{ name: string }>;
  return projects.map((project) => project.name);
};

test.describe("Проект мой, и я сам решаю, кого к нему позвать", () => {
  test("Чужого проекта не видно, пока к нему не позвали", async ({
    browser,
    request,
  }) => {
    const name = `mine-${process.pid}-${Date.now()}`;
    await universeOf(request, name);

    const other = await asOther(browser);
    await expect(projectsSeenBy(other)).resolves.not.toContain(name);
  });

  test("Позванный видит только тот проект, к которому его позвали", async ({
    browser,
    request,
  }) => {
    const shared = `shared-${process.pid}-${Date.now()}`;
    const kept = `kept-${process.pid}-${Date.now()}`;
    const id = await universeOf(request, shared);
    await universeOf(request, kept);

    const invited = await request.post(`${API_URL}/api/projects/${id}/guests`, {
      data: { email: OTHER.email },
    });
    expect(invited.status()).toBe(201);

    const other = await asOther(browser);
    const seen = await projectsSeenBy(other);

    expect(seen).toContain(shared);
    expect(seen).not.toContain(kept);
  });

  test("Гость работает во вселенной, но проект не его", async ({
    browser,
    request,
  }) => {
    const name = `guest-${process.pid}-${Date.now()}`;
    const id = await universeOf(request, name);
    await request.post(`${API_URL}/api/projects/${id}/guests`, {
      data: { email: OTHER.email },
    });

    const other = await asOther(browser);

    // Внутри вселенной гость равен хозяину: читает и доливает
    const chunks = await other.request.get(
      `${API_URL}/api/projects/${id}/chunks`,
    );
    expect(chunks.status()).toBe(200);
    const added = await other.request.post(
      `${API_URL}/api/projects/${id}/chunks`,
      { data: { text: "A guest may write here." } },
    );
    expect(added.status()).toBe(201);

    // А папка — хозяйская: ни переименовать, ни удалить, ни звать других
    const renamed = await other.request.patch(`${API_URL}/api/projects/${id}`, {
      data: { name: "taken over" },
    });
    const removed = await other.request.delete(`${API_URL}/api/projects/${id}`);
    const invited = await other.request.post(
      `${API_URL}/api/projects/${id}/guests`,
      { data: { email: "third@knife.test" } },
    );

    expect(renamed.status()).toBe(403);
    expect(removed.status()).toBe(403);
    expect(invited.status()).toBe(403);
  });

  test("Отозвал приглашение — проект исчез у гостя", async ({
    browser,
    request,
  }) => {
    const name = `revoked-${process.pid}-${Date.now()}`;
    const id = await universeOf(request, name);
    await request.post(`${API_URL}/api/projects/${id}/guests`, {
      data: { email: OTHER.email },
    });

    const other = await asOther(browser);
    await expect(projectsSeenBy(other)).resolves.toContain(name);

    const revoked = await request.delete(
      `${API_URL}/api/projects/${id}/guests`,
      { data: { email: OTHER.email } },
    );
    expect(revoked.status()).toBe(204);

    await expect(projectsSeenBy(other)).resolves.not.toContain(name);
    const afterwards = await other.request.get(
      `${API_URL}/api/projects/${id}/chunks`,
    );
    expect(afterwards.status()).toBe(404);
  });

  test("Хозяин зовёт и отзывает прямо из списка проектов", async ({
    page,
    request,
  }) => {
    const name = `ui-${process.pid}-${Date.now()}`;
    await universeOf(request, name);

    await page.goto("/");
    await page.getByRole("button", { name: "Projects" }).click();
    await page.getByRole("button", { name: `Share ${name}` }).click();

    await expect(page.getByTestId("guest-list")).toContainText("Nobody else");

    await page.getByPlaceholder("somebody@example.com").fill(OTHER.email);
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByTestId("guest-list")).toContainText(OTHER.email);

    await page.getByRole("button", { name: `Remove ${OTHER.email}` }).click();
    await expect(page.getByTestId("guest-list")).toContainText("Nobody else");

    // Наговорился — и вышел, не угадывая, что диалог держит одна лишь Escape.
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("guest-list")).toHaveCount(0);
    await expect(page.getByTestId("project-list")).toBeVisible();

    // Клик по затемнённой странице вокруг диалога говорит то же самое.
    await page.getByRole("button", { name: `Share ${name}` }).click();
    await expect(page.getByTestId("guest-list")).toBeVisible();
    await page.mouse.click(20, 20);
    await expect(page.getByTestId("guest-list")).toHaveCount(0);
    await expect(page.getByTestId("project-list")).toBeVisible();
  });
});

test.describe("Чужой глаз", () => {
  test("Владелец чужого проекта показан вместо кнопок правки", async ({
    browser,
    request,
  }) => {
    const name = `owned-${process.pid}-${Date.now()}`;
    const id = await universeOf(request, name);
    await request.post(`${API_URL}/api/projects/${id}/guests`, {
      data: { email: OTHER.email },
    });

    const other = await asOther(browser);
    await other.goto("/");
    await other.getByRole("button", { name: "Projects" }).click();

    const row = other.getByTestId("project-list").getByText(name);
    await expect(row).toBeVisible();
    await expect(other.getByTestId("project-list")).toContainText(OWNER.email);
    await expect(
      other.getByRole("button", { name: `Share ${name}` }),
    ).toHaveCount(0);
  });
});
