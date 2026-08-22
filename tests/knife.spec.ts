import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Функция: Вселенная требований, в которой можно ориентироваться
 *
 * Как человек, который годами приносит длинные простыни markdown,
 * я хочу видеть повторы и висящие куски и вычищать их,
 * чтобы и через пять лет я и агенты находили в требованиях нужное,
 * не перечитывая всё глазами.
 *
 * Предыстория: у меня есть проект — вселенная, куда годами вливаются файлы,
 * и весь текст в ней на английском.
 */

const FIXTURES = path.join(__dirname, "fixtures");
const SHEET = path.join(FIXTURES, "night-audit.md");
const HANDBOOK = path.join(FIXTURES, "handbook.txt");

let projectCount = 0;

/** Заводит проект — папку, вселенная в нём появится следом. */
const createProject = async (page: Page): Promise<string> => {
  projectCount += 1;
  const name = `project-${process.pid}-${projectCount}`;

  await page.goto("/");
  await page.getByPlaceholder("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("project-picker")).toContainText(name);

  return name;
};

const bringSheet = async (page: Page, file: string): Promise<void> => {
  await page.locator('input[type="file"]').setInputFiles(file);
  // Именно про этот файл: сообщение о предыдущем ещё висит на экране
  await expect(
    page.getByText(RegExp(`Added \\d+ chunks from ${path.basename(file)}`)),
  ).toBeVisible();
};

/** Интерфейс чанки не считает, поэтому спрашиваем у самой вселенной. */
const chunkCount = async (page: Page): Promise<number> => {
  const projectId = await page.evaluate(() =>
    localStorage.getItem("knife:project"),
  );
  const response = await page.request.get(`/api/projects/${projectId}/chunks`);
  return ((await response.json()) as unknown[]).length;
};

const chosen = async (rows: Locator, at: number): Promise<null | string> =>
  rows.nth(at).getAttribute("aria-current");

const chunkRow = (page: Page, text: RegExp | string) =>
  page
    .getByTestId("chunk-list")
    .getByRole("button")
    .filter({ has: page.getByTestId("chunk-text").filter({ hasText: text }) });

const wordRow = (page: Page, label: RegExp | string) =>
  page.getByTestId("word-list").getByRole("button", { name: label });

test.describe("Вселенная требований, в которой можно ориентироваться", () => {
  test("Приношу простыню", async ({ page }) => {
    await createProject(page);

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
    await createProject(page);

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

  test("Вставляю простыню прямо в поле, а не файлом", async ({ page }) => {
    await createProject(page);

    const sheet = [
      "# Night audit",
      "",
      "The night auditor closes the shift report before midnight.",
      "",
      "Breaks are unpaid; overtime is approved by the property manager.",
    ].join("\n");

    const field = page.getByPlaceholder(/paste a whole sheet/);
    await field.fill(sheet);

    // Сколько выйдет чанков, видно до нажатия
    await expect(page.getByTestId("paste-preview")).toHaveText("4 chunks");

    await page.getByRole("button", { exact: true, name: "Add" }).click();

    // Разрез тот же, что у файла: заголовок и точка с запятой режут
    await expect(chunkRow(page, /^Night audit$/)).toBeVisible();
    await expect(chunkRow(page, "Breaks are unpaid;")).toBeVisible();
    await expect.poll(async () => chunkCount(page)).toBe(4);
  });

  test("Одна фраза остаётся одним чанком", async ({ page }) => {
    await createProject(page);

    await page
      .getByPlaceholder(/paste a whole sheet/)
      .fill("The night auditor closes the shift report.");

    await expect(page.getByTestId("paste-preview")).toHaveText("One chunk");

    await page.getByRole("button", { exact: true, name: "Add" }).click();

    await expect.poll(async () => chunkCount(page)).toBe(1);
  });

  test("Строки таблиц живут наравне с текстом", async ({ page }) => {
    await createProject(page);
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
    await expect(inspector).toContainText("Said twice");
    await expect(inspector).toContainText(
      "The night auditor closes the shift report before midnight.",
    );
  });

  test("Вижу повторы", async ({ page }) => {
    await createProject(page);

    // Первый файл пришёл раньше, второй сегодня
    await bringSheet(page, SHEET);
    await bringSheet(page, HANDBOOK);

    await chunkRow(
      page,
      "The night auditor closes the shift report before midnight.",
    ).click();

    const inspector = page.getByTestId("chunk-inspector");
    // Повтор назван повтором, а не просто общими словами
    const repeats = inspector.locator("section", {
      hasText: "Said twice",
    });
    // Насколько похожи
    await expect(repeats).toContainText(/\d+%/);
    // И какие слова совпали — видно прямо в тексте соседа
    await expect(
      repeats
        .locator("mark")
        .filter({ hasText: /auditor/i })
        .first(),
    ).toBeVisible();
    await expect(repeats).toContainText(/\d{4}-\d{2}-\d{2}/);
  });

  test("Иду по спискам стрелками", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    // Открыл один чанк — дальше листаю с клавиатуры
    const chunks = page.getByTestId("chunk-list").getByRole("button");
    await chunks.first().click();
    await expect.poll(async () => chosen(chunks, 0)).toBe("true");

    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => chosen(chunks, 1)).toBe("true");
    expect(await chosen(chunks, 0)).toBe("false");

    await page.keyboard.press("ArrowUp");
    await expect.poll(async () => chosen(chunks, 0)).toBe("true");

    // И то же самое в колонке слов
    const words = page.getByTestId("word-list").getByRole("button");
    await words.first().click();
    await expect.poll(async () => chosen(words, 0)).toBe("true");

    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => chosen(words, 1)).toBe("true");
    expect(await chosen(words, 0)).toBe("false");
  });

  test("Оставляю в списке одну беду за раз", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    const rows = page.getByTestId("chunk-list").getByRole("button");
    const all = await rows.count();

    // Только висящие: одинокий на месте, а повтор ушёл
    await page.getByLabel("Show").selectOption("dangling");
    await expect.poll(async () => rows.count()).toBeLessThan(all);
    await expect(
      chunkRow(page, "Peacocks roam the orangery unsupervised."),
    ).toBeVisible();
    await expect(
      chunkRow(page, "The night auditor closes the shift report"),
    ).toBeHidden();

    // Только повторы: теперь наоборот
    await page.getByLabel("Show").selectOption("duplicates");
    await expect(
      chunkRow(page, "The night auditor closes the shift report"),
    ).toBeVisible();
    await expect(
      chunkRow(page, "Peacocks roam the orangery unsupervised."),
    ).toBeHidden();

    await page.getByLabel("Show").selectOption("all");
    await expect.poll(async () => rows.count()).toBe(all);
  });

  test("Вижу висящие куски", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    const lonely = chunkRow(page, "Peacocks roam the orangery unsupervised.");
    await expect(lonely.locator("em").getByText("hanging")).toBeVisible();

    await lonely.click();
    await expect(page.getByTestId("chunk-inspector")).toContainText("Hanging");
  });

  test("Формы одного слова — одно слово", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    await page.getByPlaceholder("Find in chunks").fill("shift");

    // "shift" находит и "shifts", и "shift"
    await expect(chunkRow(page, "A shift starts at eight.")).toBeVisible();
    await expect(
      chunkRow(page, "All shifts are approved by the manager."),
    ).toBeVisible();

    // И в списке слов это одна строка, а не две
    await page.getByPlaceholder("Find a word").fill("shift");
    await expect(page.getByTestId("word-list").getByRole("button")).toHaveCount(
      1,
    );
  });

  test("Слово ведёт к связям и вхождениям: ввожу слово в поиск", async ({
    page,
  }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    await page.getByPlaceholder("Find a word").fill("auditor");
    await wordRow(page, /^auditor \d+$/).click();

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

  test("Слово ведёт к связям и вхождениям: кликаю по слову в списке", async ({
    page,
  }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    await wordRow(page, /^auditor \d+$/).click();

    const word = page.getByTestId("word-inspector");
    await expect(word).toContainText("Travels with");
    await expect(word).toContainText(/Appears in \d+ chunks/);
  });

  test("Ищу по обрывку слова", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    // Точного слова знать не нужно: хватает куска
    await page.getByPlaceholder("Find in chunks").fill("audit");
    await expect(
      chunkRow(page, "The night auditor closes the shift report"),
    ).toBeVisible();

    // И список слов сужается тем же обрывком: остаётся только родня
    await page.getByPlaceholder("Find a word").fill("audit");
    await expect(wordRow(page, /^auditor \d+$/)).toBeVisible();
    await expect(wordRow(page, /^peacocks? \d+$/)).toBeHidden();
  });

  test("Хожу между списком слов и текстом", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    // Из слова попадаю в чанки, где оно есть
    await wordRow(page, /^peacocks? \d+$/).click();
    const word = page.getByTestId("word-inspector");
    await expect(word).toContainText("Peacocks roam the orangery");

    // И обратно: из вхождения — в сам чанк
    await word.getByRole("button", { name: /Peacocks roam/ }).click();
    await expect(page.getByTestId("chunk-inspector")).toContainText("Peacocks");
  });

  test("Выбрано всегда одно: или слово, или чанк", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    const chosenWord = page
      .getByTestId("word-list")
      .locator('[aria-current="true"]');
    const chosenChunk = page
      .getByTestId("chunk-list")
      .locator('[aria-current="true"]');

    await wordRow(page, /^auditor \d+$/).click();
    await expect(chosenWord).toHaveCount(1);
    await expect(chosenChunk).toHaveCount(0);

    // Открываю чанк — и список слов отпускает своё
    await chunkRow(page, "A shift starts at eight.").click();
    await expect(chosenChunk).toHaveCount(1);
    await expect(chosenWord).toHaveCount(0);
  });

  test("Выбираю, насколько похожие повторы показывать", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);
    await bringSheet(page, HANDBOOK);

    const levels = page.getByTestId("repeat-level");
    const countOn = async (label: string): Promise<number> => {
      const text =
        (await levels
          .getByRole("button", { name: RegExp(label) })
          .textContent()) ?? "";
      return Number(/(\d+)\s*$/.exec(text)?.[1] ?? "0");
    };

    // Каждый уровень заранее говорит, сколько повторов покажет
    await expect
      .poll(async () => (await countOn("Loosely alike")) > 0)
      .toBe(true);
    const loose = await countOn("Loosely alike");
    const strict = await countOn("Almost the same");
    expect(loose).toBeGreaterThan(strict);

    // И выбор уровня меняет то, что помечено в списке
    await levels.getByRole("button", { name: /Loosely alike/ }).click();
    const marked = async (): Promise<number> =>
      page.getByTestId("chunk-list").getByText("dup").count();
    await expect.poll(marked).toBeGreaterThan(0);
    const wide = await marked();

    await levels.getByRole("button", { name: /Almost the same/ }).click();
    await expect.poll(marked).toBeLessThan(wide);
  });

  test("Правки нет — удаляю и завожу заново", async ({ page }) => {
    await createProject(page);
    await bringSheet(page, SHEET);

    const doomed = chunkRow(page, "A shift starts at eight.");
    await doomed.click();

    // Править нечем: в открытом чанке нет ни одного поля ввода
    const inspector = page.getByTestId("chunk-inspector");
    await expect(inspector.getByRole("textbox")).toHaveCount(0);

    await inspector.getByRole("button", { name: "Delete" }).click();

    // Старый чанк исчезает насовсем
    await expect(doomed).toBeHidden();

    // Новый становится обычным чанком, наравне с остальными
    await page
      .getByPlaceholder(/paste a whole sheet/)
      .fill("Every shift starts at eight sharp.");
    await page.getByRole("button", { exact: true, name: "Add" }).click();

    const fresh = chunkRow(page, "Every shift starts at eight sharp.");
    await expect(fresh).toBeVisible();

    await page.getByPlaceholder("Find in chunks").fill("shift");
    await expect(fresh).toBeVisible();
  });

  test("Правки нет: API не принимает изменение чанка", async ({ request }) => {
    const project = await request.post("/api/projects", {
      data: { name: `no-edit-${process.pid}-${Date.now()}` },
    });
    const { id } = (await project.json()) as { id: string };

    const created = await request.post(`/api/projects/${id}/chunks`, {
      data: { text: "A shift starts at eight." },
    });
    const chunk = (await created.json()) as { id: string };

    const patched = await request.patch(`/api/chunks/${chunk.id}`, {
      data: { text: "rewritten" },
    });
    const replaced = await request.put(`/api/chunks/${chunk.id}`, {
      data: { text: "rewritten" },
    });

    expect(patched.status()).toBe(404);
    expect(replaced.status()).toBe(404);
  });

  test("Ничего, кроме текста, не хранится", async ({ page, request }) => {
    await createProject(page);
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
    const lonely = chunkRow(page, "Peacocks roam the orangery unsupervised.");
    await expect(lonely.locator("em").getByText("hanging")).toBeVisible();

    await page.reload();
    await expect(
      chunkRow(page, "Peacocks roam the orangery unsupervised.")
        .locator("em")
        .getByText("hanging"),
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
    await page.getByTestId("project-picker").selectOption(id);

    const started = Date.now();
    await expect(
      page
        .getByTestId("repeat-level")
        .getByRole("button", { name: /Loosely alike [1-9]\d*/ }),
    ).toBeVisible({ timeout: 30000 });
    expect(Date.now() - started).toBeLessThan(30000);
    await expect.poll(async () => chunkCount(page)).toBe(4000);

    // Удаление одного чанка — обычное движение в этом инструменте, и оно не
    // должно стоить дороже, чем открыть проект целиком.
    await page.getByPlaceholder("Find in chunks").fill("midnight");
    await chunkRow(
      page,
      "The night auditor closes the shift report before midnight.",
    )
      .first()
      .click();

    const deleting = Date.now();
    await page
      .getByTestId("chunk-inspector")
      .getByRole("button", { name: "Delete" })
      .click();
    await expect.poll(async () => chunkCount(page)).toBe(3999);
    expect(Date.now() - deleting).toBeLessThan(5000);
  });
});
