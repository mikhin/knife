import { expect, test } from "@playwright/test";

/**
 * Не сценарии из требований, а страховка от тихого отказа: действие, которое
 * не удалось, обязано сказать об этом, а не выглядеть как сработавшее.
 */
test.describe("Когда что-то не получилось", () => {
  test("Занятое имя проекта не проглатывается молча", async ({ page }) => {
    const name = `taken-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await page.getByPlaceholder("new universe").fill(name);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.locator("select")).toContainText(name);

    await page.getByPlaceholder("new universe").fill(name);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByTestId("stats")).toContainText("already exists");
  });

  test("Пустой проект не притворяется посчитанным", async ({ page }) => {
    const name = `empty-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await page.getByPlaceholder("new universe").fill(name);
    await page.getByRole("button", { name: "Create" }).click();

    const stats = page.getByTestId("stats");
    await expect(stats).not.toContainText("duplicate pairs");
    await expect(stats).not.toContainText("counted in");
  });
});
