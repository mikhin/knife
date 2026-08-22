import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Не сценарии из требований, а страховка от тихого отказа: действие, которое
 * не удалось, обязано сказать об этом, а не выглядеть как сработавшее.
 */
/** Панель проектов лежит поверх вселенной и по умолчанию убрана. */
const openProjects = async (page: Page): Promise<void> => {
  const sidebar = page.getByTestId("project-sidebar");
  if (
    !(await sidebar.getByRole("button", { name: "New project" }).isVisible())
  ) {
    await page.getByRole("button", { name: "Projects" }).click();
  }
  await expect(
    sidebar.getByRole("button", { name: "New project" }),
  ).toBeVisible();
};

test.describe("Когда что-то не получилось", () => {
  test("Занятое имя проекта не проглатывается молча", async ({ page }) => {
    const name = `taken-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await openProjects(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("New project").fill(name);
    await page.getByRole("button", { exact: true, name: "Create" }).click();
    await expect(page.getByTestId("open-project")).toHaveText(name);

    await openProjects(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("New project").fill(name);
    await page.getByRole("button", { exact: true, name: "Create" }).click();

    await expect(page.getByTestId("failure")).toContainText("already exists");
  });

  test("Настройка из прошлой версии не роняет экран", async ({ page }) => {
    const name = `stale-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await openProjects(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("New project").fill(name);
    await page.getByRole("button", { exact: true, name: "Create" }).click();
    await expect(page.getByTestId("open-project")).toHaveText(name);

    await page
      .getByPlaceholder("Write a chunk, or paste a whole sheet")
      .fill("A shift starts at eight.");
    await page.getByRole("button", { exact: true, name: "Add" }).click();
    await expect(page.getByTestId("chunk-list")).toContainText("A shift");

    // Браузер помнит проверку, которой в этой версии уже нет
    await page.evaluate(() => {
      localStorage.setItem("knife:chunk-filter", "water");
      localStorage.setItem("knife:chunk-order", "по-старому");
      localStorage.setItem("knife:similarity", "");
    });
    await page.reload();

    // Экран жив, а настройки читаются как значения по умолчанию
    await expect(page.getByTestId("chunk-list")).toContainText("A shift");
    await expect(page.getByLabel("Show")).toHaveValue("all");
    await expect(
      page.getByTestId("repeat-level").getByRole("button", {
        name: /Loosely alike/,
      }),
    ).toHaveClass(/border-accent/);
  });

  test("Пустой проект не притворяется посчитанным", async ({ page }) => {
    const name = `empty-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await openProjects(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("New project").fill(name);
    await page.getByRole("button", { exact: true, name: "Create" }).click();

    await expect(
      page.getByTestId("repeat-level").getByRole("button", {
        name: /Almost the same 0/,
      }),
    ).toBeVisible();
    await expect(page.getByTestId("chunk-list")).toBeEmpty();
  });
});
