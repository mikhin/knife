import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Проекты — обычная папка: их заводят, переименовывают и удаляют. Ограничение
 * «правки нет» относится к чанкам, а не к тому, как называется их вселенная.
 */
const createProject = async (page: Page, name: string): Promise<void> => {
  await page.getByPlaceholder("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator("select")).toContainText(name);
};

test.describe("Проекты заводятся, переименовываются и удаляются", () => {
  test("Новый проект появляется выбранным", async ({ page }) => {
    const name = `folder-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, name);

    await expect(page.locator("select")).toHaveValue(/.+/);
    await expect(page.locator("select")).toContainText(name);
  });

  test("Проект можно переименовать, чанки остаются на месте", async ({
    page,
  }) => {
    const before = `before-${process.pid}-${Date.now()}`;
    const after = `after-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, before);

    await page
      .getByPlaceholder(/paste a whole sheet/)
      .fill("The night auditor closes the shift report.");
    await page.getByRole("button", { exact: true, name: "Add" }).click();
    await expect(page.getByTestId("chunk-list")).toContainText("night auditor");

    await page.getByRole("button", { name: "Rename" }).click();
    await page.getByLabel("New name for this project").fill(after);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("select")).toContainText(after);
    await expect(page.getByTestId("chunk-list")).toContainText("night auditor");
  });

  test("Занятое имя при переименовании не проглатывается", async ({ page }) => {
    const taken = `taken-${process.pid}-${Date.now()}`;
    const mine = `mine-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, taken);
    await createProject(page, mine);

    await page.getByRole("button", { name: "Rename" }).click();
    await page.getByLabel("New name for this project").fill(taken);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByTestId("failure")).toContainText("already exists");
    await expect(page.locator("select")).toContainText(mine);
  });

  test("Удаление спрашивает и говорит, что унесёт с собой", async ({
    page,
  }) => {
    const name = `doomed-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, name);
    await page
      .getByPlaceholder(/paste a whole sheet/)
      .fill("The night auditor closes the shift report.");
    await page.getByRole("button", { exact: true, name: "Add" }).click();
    await expect(page.getByTestId("chunk-list")).toContainText("night auditor");

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(/Delete .* and its 1 chunks/)).toBeVisible();

    // Передумать можно, и тогда ничего не происходит
    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.locator("select")).toContainText(name);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();

    await expect(page.locator("select")).not.toContainText(name);
  });
});
