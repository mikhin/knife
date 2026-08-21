import { expect, test } from "@playwright/test";

/**
 * Не сценарии из требований, а страховка от тихого отказа: действие, которое
 * не удалось, обязано сказать об этом, а не выглядеть как сработавшее.
 */
test.describe("Когда что-то не получилось", () => {
  test("Занятое имя проекта не проглатывается молча", async ({ page }) => {
    const name = `taken-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await page.getByPlaceholder("New project name").fill(name);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.locator("select")).toContainText(name);

    await page.getByPlaceholder("New project name").fill(name);
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByTestId("failure")).toContainText("already exists");
  });

  test("Пустой проект не притворяется посчитанным", async ({ page }) => {
    const name = `empty-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await page.getByPlaceholder("New project name").fill(name);
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText(/of \d+ pairs/)).toContainText("0 of 0 pairs");
    await expect(page.getByTestId("chunk-list")).toBeEmpty();
  });
});
