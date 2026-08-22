import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Проекты — обычная папка: их заводят, переименовывают и удаляют. Ограничение
 * «правки нет» относится к чанкам, а не к тому, как называется их вселенная.
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

/** Строка проекта в списке — вместе с кнопками, которые на ней живут. */
const projectRow = (page: Page, name: string) =>
  page.getByTestId("project-list").locator("li").filter({ hasText: name });

const createProject = async (page: Page, name: string): Promise<void> => {
  await openProjects(page);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("New project").fill(name);
  await page.getByRole("button", { exact: true, name: "Create" }).click();
  await expect(page.getByTestId("open-project")).toHaveText(name);
};

test.describe("Проекты заводятся, переименовываются и удаляются", () => {
  test("Новый проект появляется выбранным", async ({ page }) => {
    const name = `folder-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, name);

    await expect(page.getByTestId("open-project")).toHaveText(name);

    // И он же отмечен в списке, когда панель открыта
    await openProjects(page);
    await expect(
      page.getByTestId("project-list").locator('[aria-current="true"]'),
    ).toContainText(name);
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

    await openProjects(page);
    await projectRow(page, before)
      .getByRole("button", { name: "Rename" })
      .click();
    await page.getByLabel("Rename project").fill(after);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByTestId("open-project")).toHaveText(after);
    await expect(page.getByTestId("chunk-list")).toContainText("night auditor");
  });

  test("Занятое имя при переименовании не проглатывается", async ({ page }) => {
    const taken = `taken-${process.pid}-${Date.now()}`;
    const mine = `mine-${process.pid}-${Date.now()}`;

    await page.goto("/");
    await createProject(page, taken);
    await createProject(page, mine);

    await openProjects(page);
    await projectRow(page, mine)
      .getByRole("button", { name: "Rename" })
      .click();
    await page.getByLabel("Rename project").fill(taken);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByTestId("failure")).toContainText("already exists");
    await expect(page.getByTestId("open-project")).toHaveText(mine);
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

    await openProjects(page);
    await projectRow(page, name)
      .getByRole("button", { name: "Delete" })
      .click();
    const asked = page.getByRole("dialog");
    await expect(asked).toContainText(/Delete .* and its 1 chunks/);

    // Передумать можно, и тогда ничего не происходит
    await asked.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("open-project")).toHaveText(name);

    await openProjects(page);
    await projectRow(page, name)
      .getByRole("button", { name: "Delete" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByTestId("open-project")).not.toHaveText(name);
  });
});
