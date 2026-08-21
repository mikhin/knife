import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Функция: Вселенная требований, в которой можно ориентироваться
 *
 * Как человек, который годами приносит длинные простыни markdown,
 * я хочу видеть повторы, воду и висящие куски на графе и вычищать их,
 * чтобы и через пять лет я и агенты находили в требованиях нужное,
 * не перечитывая всё глазами.
 *
 * Предыстория: у меня есть проект — вселенная, куда годами вливаются файлы,
 * и весь текст в ней на английском.
 */

const FIXTURES = path.join(__dirname, "fixtures");
const SHEET = path.join(FIXTURES, "night-audit.md");
const HANDBOOK = path.join(FIXTURES, "handbook.txt");

let universeCount = 0;

const openUniverse = async (page: Page): Promise<string> => {
  universeCount += 1;
  const name = `universe-${process.pid}-${universeCount}`;

  await page.goto("/");
  await page.getByPlaceholder("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator("select")).toContainText(name);

  return name;
};

const bringSheet = async (page: Page, file: string): Promise<void> => {
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText(/Added \d+ chunks from/)).toBeVisible();
};

/** Сколько чанков во вселенной, видно там же, где её выбирают. */
const chunkCount = async (page: Page): Promise<number> => {
  const label = await page.locator("select option:checked").textContent();
  return Number(/\((\d+) chunks\)/.exec(label ?? "")?.[1] ?? "0");
};

const chunkRow = (page: Page, text: string) =>
  page
    .getByTestId("chunk-list")
    .getByRole("button", { exact: false, name: text });

type NodePosition = { id: string; x: number; y: number };

/**
 * Клик по координатам узла, которые граф публикует, когда симуляция улеглась.
 * Раньше здесь был перебор сетки из 126 слепых кликов — он попадал по узлу
 * через оконный слушатель, то есть проходил бы и на сломанном графе.
 */
const clickAnyGraphNode = async (page: Page): Promise<string> => {
  const canvas = page.getByTestId("graph").locator("canvas");
  await expect(canvas).toBeVisible();

  await expect
    .poll(async () => (await canvas.getAttribute("data-nodes")) !== null, {
      message: "граф так и не разложил узлы",
      timeout: 20000,
    })
    .toBe(true);

  const positions = JSON.parse(
    (await canvas.getAttribute("data-nodes")) ?? "[]",
  ) as NodePosition[];

  const box = await canvas.boundingBox();
  const target = positions.find(
    (node) =>
      box !== null &&
      node.x > 0 &&
      node.y > 0 &&
      node.x < box.width &&
      node.y < box.height,
  );

  if (!box || !target) {
    throw new Error("ни один узел не оказался в видимой части графа");
  }

  await page.mouse.click(box.x + target.x, box.y + target.y);

  return target.id;
};

test.describe("Вселенная требований, в которой можно ориентироваться", () => {
  test("Приношу простыню", async ({ page }) => {
    await openUniverse(page);

    await bringSheet(page, SHEET);

    // Текст режется по точкам, точкам с запятой и двоеточиям
    await expect(chunkRow(page, "Breaks are unpaid;")).toBeVisible();
    await expect(
      chunkRow(page, "overtime is approved by the property manager."),
    ).toBeVisible();
    await expect(chunkRow(page, "A shift starts at eight.")).toBeVisible();
  });

  test("Приношу простыню, которая не влезает в один запрос", async ({
    page,
  }) => {
    await openUniverse(page);

    const sheet = Array.from(
      { length: 4000 },
      (_, position) =>
        `The night auditor closes the shift report of week ${position}.`,
    ).join("\n\n");

    await page.locator('input[type="file"]').setInputFiles({
      buffer: Buffer.from(sheet, "utf8"),
      mimeType: "text/markdown",
      name: "big-sheet.md",
    });

    await expect(page.getByText(/Added 4000 chunks from/)).toBeVisible({
      timeout: 60000,
    });
    await expect.poll(async () => chunkCount(page)).toBe(4000);
  });

  test("Строки таблиц живут наравне с текстом", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    // Строка таблицы стала обычным чанком — и с внешними трубами, и без них
    const row = chunkRow(page, "Night auditor — Closes the shift report");
    await expect(row).toBeVisible();
    await expect(
      chunkRow(page, "Housekeeper — Restocks the minibar"),
    ).toBeVisible();

    // И повтор между строкой таблицы и абзацем показан как дубль
    await row.click();
    const inspector = page.getByTestId("chunk-inspector");
    await expect(inspector).toContainText("Duplicates");
    await expect(inspector).toContainText(
      "The night auditor closes the shift report before midnight.",
    );
  });

  test("Вижу повторы", async ({ page }) => {
    await openUniverse(page);

    // Первый файл пришёл раньше, второй сегодня
    await bringSheet(page, SHEET);
    await bringSheet(page, HANDBOOK);

    await chunkRow(
      page,
      "The night auditor closes the shift report before midnight.",
    ).click();

    const inspector = page.getByTestId("chunk-inspector");
    // Насколько похожи
    await expect(inspector).toContainText(/\d+%/);
    // И какие слова совпали
    await expect(inspector).toContainText(/shared: .*auditor/);
    await expect(inspector).toContainText(/arrived \d{4}-\d{2}-\d{2}/);
  });

  test("Вижу воду", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    const watery = chunkRow(page, "It should be noted that this is basically");
    await expect(
      watery.locator("xpath=../span").getByText("water"),
    ).toBeVisible();

    await watery.click();
    const inspector = page.getByTestId("chunk-inspector");
    await expect(inspector).toContainText("Water");
    // И мне сказано, какое правило сработало
    await expect(inspector).toContainText("stop-word-flood");
  });

  test("Вижу висящие куски", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    const lonely = chunkRow(page, "Peacocks roam the orangery unsupervised.");
    await expect(
      lonely.locator("xpath=../span").getByText("hanging"),
    ).toBeVisible();

    await lonely.click();
    await expect(page.getByTestId("chunk-inspector")).toContainText("Hanging");
  });

  test("Формы одного слова — одно слово", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    await page.getByPlaceholder(/Search a word/).fill("shift");

    // "shift" находит и "shifts", и "shift"
    await expect(chunkRow(page, "A shift starts at eight.")).toBeVisible();
    await expect(
      chunkRow(page, "All shifts are approved by the manager."),
    ).toBeVisible();

    // И это один узел, а не два: у слова один профиль на все формы
    const word = page.getByTestId("word-inspector");
    await expect(word.getByRole("heading", { level: 2 })).toHaveText(/shifts?/);
  });

  test("Слово ведёт к связям и вхождениям: ввожу слово в поиск", async ({
    page,
  }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    await page.getByPlaceholder(/Search a word/).fill("auditor");

    const word = page.getByTestId("word-inspector");
    // Вижу все чанки, где это слово есть
    await expect(word).toContainText(/Appears in \d+ chunks/);
    await expect(word).toContainText("closes the shift report");
    // И вижу, с какими словами оно ходит вместе
    await expect(word).toContainText("Travels with");
    await expect(
      word.getByRole("button", { name: /^night \d+$/ }),
    ).toBeVisible();
  });

  test("Слово ведёт к связям и вхождениям: кликаю по слову на графе", async ({
    page,
  }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    await page.getByRole("button", { name: "Words" }).click();
    await clickAnyGraphNode(page);

    const word = page.getByTestId("word-inspector");
    await expect(word).toContainText("Travels with");
    await expect(word).toContainText(/Appears in \d+ chunks/);
  });

  test("Хожу между графом и текстом", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    // Кликаю по узлу графа — попадаю на этот чанк
    await clickAnyGraphNode(page);
    await expect(page.getByTestId("chunk-inspector")).toBeVisible();

    // И наоборот: из чанка попадаю в его место на графе
    await page.getByPlaceholder(/Search a word/).fill("peacock");
    await chunkRow(page, "Peacocks roam the orangery unsupervised.").click();
    await expect(page.getByRole("button", { name: "Chunks" })).toHaveClass(
      /border-accent/,
    );
    await expect(page.getByTestId("chunk-inspector")).toContainText("Peacocks");
  });

  test("Кручу пороги под свой текст", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);
    await bringSheet(page, HANDBOOK);

    // Сколько пар прошло порог, написано рядом с самим ползунком.
    const pairsAt = async (): Promise<number> => {
      const text = (await page.getByText(/of \d+ pairs/).textContent()) ?? "";
      return Number(/(\d+) of/.exec(text)?.[1] ?? "0");
    };

    const slider = page.locator('input[type="range"]');
    await slider.fill((await slider.getAttribute("min")) ?? "0.25");

    const loose = await pairsAt();
    expect(loose).toBeGreaterThan(0);

    await slider.fill("0.99");
    await expect
      .poll(pairsAt, { message: "порог поднят — пар должно стать меньше" })
      .toBeLessThan(loose);
  });

  test("Правки нет — пишу новый чанк рядом", async ({ page }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    await chunkRow(page, "A shift starts at eight.").click();
    await expect(page.getByTestId("chunk-inspector")).toContainText(
      "A chunk is never edited",
    );

    // Новый становится обычным чанком, наравне с остальными
    await page
      .getByPlaceholder("Write a new chunk")
      .fill("Every shift starts at eight sharp.");
    await page.getByRole("button", { exact: true, name: "Add" }).click();

    const fresh = chunkRow(page, "Every shift starts at eight sharp.");
    await expect(fresh).toBeVisible();

    await page.getByPlaceholder(/Search a word/).fill("shift");
    await expect(fresh).toBeVisible();
  });

  test("Правки нет: API не принимает ни изменение, ни удаление чанка", async ({
    request,
  }) => {
    const project = await request.post("/api/projects", {
      data: { name: `no-edit-${process.pid}-${Date.now()}` },
    });
    const { id } = (await project.json()) as { id: string };

    const created = await request.post(`/api/projects/${id}/chunks`, {
      data: { text: "A shift starts at eight." },
    });
    const chunk = (await created.json()) as { id: string };

    const route = `/api/projects/${id}/chunks/${chunk.id}`;
    const patched = await request.patch(route, { data: { text: "rewritten" } });
    const replaced = await request.put(route, { data: { text: "rewritten" } });
    const deleted = await request.delete(route);

    expect(patched.status()).toBe(404);
    expect(replaced.status()).toBe(404);
    expect(deleted.status()).toBe(404);
  });

  test("Ничего, кроме текста, не хранится", async ({ page, request }) => {
    await openUniverse(page);
    await bringSheet(page, SHEET);

    const projectId = await page.evaluate(() =>
      localStorage.getItem("knife:project"),
    );

    // В базе живёт только текст: ни дублей, ни воды, ни связей
    const stored = await request.get(`/api/projects/${projectId}/chunks`);
    const chunks = (await stored.json()) as Array<Record<string, unknown>>;
    for (const chunk of chunks) {
      expect(Object.keys(chunk).toSorted()).toEqual([
        "createdAt",
        "id",
        "projectId",
        "text",
      ]);
    }

    // А вердикты считаются на месте — и после перезагрузки считаются заново
    const wet = chunkRow(page, "It should be noted that this is basically");
    await expect(wet.locator("xpath=../span").getByText("water")).toBeVisible();

    await page.reload();
    await expect(
      chunkRow(page, "It should be noted that this is basically")
        .locator("xpath=../span")
        .getByText("water"),
    ).toBeVisible();
  });

  test("Вселенная растёт годами", async ({ page, request }) => {
    const project = await request.post("/api/projects", {
      data: { name: `big-${process.pid}-${Date.now()}` },
    });
    const { id } = (await project.json()) as { id: string };

    const words = ["shift", "auditor", "payroll", "quota", "roster", "linen"];
    const texts = Array.from({ length: 4000 }, (_, position) => {
      const a = words[position % words.length];
      const b = words[(position * 7) % words.length];
      // Каждый пятидесятый повторяет предыдущий — чтобы дубли были настоящими
      return position % 50 === 0
        ? "The night auditor closes the shift report before midnight."
        : `The ${a} report covers the ${b} of week ${position % 300}.`;
    });

    // Чанки ложатся кучей и без порядка, так что пачки летят разом.
    const batches = Array.from({ length: texts.length / 1000 }, (_, batch) =>
      request.post(`/api/projects/${id}/chunks/bulk`, {
        data: { texts: texts.slice(batch * 1000, batch * 1000 + 1000) },
      }),
    );
    await Promise.all(batches);

    await page.goto("/");
    await page.selectOption("select", id);

    const started = Date.now();
    await expect(page.getByText(/of [1-9]\d* pairs/)).toBeVisible({
      timeout: 30000,
    });
    expect(Date.now() - started).toBeLessThan(30000);
    await expect.poll(async () => chunkCount(page)).toBe(4000);
  });
});
