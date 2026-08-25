import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AddChunksTool, ADDED_SHOWN } from "@/mcp/add-chunks.tool";
import { DeleteChunkTool } from "@/mcp/delete-chunk.tool";
import { FindDanglingTool, HANGING_SHOWN } from "@/mcp/find-dangling.tool";
import { FindDuplicatesTool, PAIRS_SHOWN } from "@/mcp/find-duplicates.tool";
import { GetChunkTool, WORDS_IN_CHUNK } from "@/mcp/get-chunk.tool";
import { GetWordTool, OCCURRENCES_SHOWN } from "@/mcp/get-word.tool";
import { FLAGGED_SHOWN, LintUniverseTool } from "@/mcp/lint-universe.tool";
import { CHUNKS_SHOWN, ListChunksTool } from "@/mcp/list-chunks.tool";
import { ListWordsTool, WORDS_SHOWN } from "@/mcp/list-words.tool";
import { HITS_SHOWN, SearchChunksTool } from "@/mcp/search-chunks.tool";
import { READ_SCOPE, WRITE_SCOPE } from "@/mcp/oauth/knife-scopes";
import { REPEAT_LEVELS } from "@knife/universe";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RepeatLevelId } from "@knife/universe";

const LEVEL_IDS = REPEAT_LEVELS.map((level) => level.id) as [
  RepeatLevelId,
  ...RepeatLevelId[],
];

const LEVELS_SAID = REPEAT_LEVELS.map(
  (level) => `${level.id} — ${level.label}, similarity ${level.from} and up`,
).join("; ");

/** Named the way a person says it: no agent should have to learn a uuid. */
const PROJECT = z.string().min(1).describe("Project name, as a person says it");

const listSize = (fallback: number, what: string) =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(fallback)
    .describe(`How many ${what} to list; the rest are counted, not hidden`);

/** Every tool answers as text: this is a conversation, not a data feed. */
const said = (text: string) => ({
  content: [{ text, type: "text" as const }],
});

/**
 * Who is asking comes from the pass the agent carried in, never from the call
 * itself. An agent that could name its own person would only need to guess an
 * id to read somebody else's universe.
 *
 * The scope is asked for here, tool by tool, because reading and deleting are
 * separate grants: a pass allowed only to delete still opens the door, and a
 * pass allowed only to read is turned away at the one tool that takes away.
 */
const personOf = (auth: AuthInfo | undefined, needs: string): string => {
  const userId = auth?.extra?.["userId"];

  if (typeof userId !== "string") {
    throw new Error("This pass names nobody");
  }
  if (!auth?.scopes.includes(needs)) {
    throw new Error(`This pass does not allow ${needs}`);
  }

  return userId;
};

/**
 * A server per request. Nothing here remembers a caller between calls, so a
 * machine can be stopped and replaced mid-conversation without an agent
 * noticing; what is expensive to compute is held by UniverseIndexService,
 * which outlives the request but never the process.
 */
@Injectable()
export class McpService {
  constructor(
    private readonly adding: AddChunksTool,
    private readonly chunk: GetChunkTool,
    private readonly dangling: FindDanglingTool,
    private readonly deleting: DeleteChunkTool,
    private readonly duplicates: FindDuplicatesTool,
    private readonly linters: LintUniverseTool,
    private readonly listing: ListChunksTool,
    private readonly search: SearchChunksTool,
    private readonly word: GetWordTool,
    private readonly words: ListWordsTool,
  ) {}

  create(): McpServer {
    const server = new McpServer({ name: "knife", version: "0.0.0" });

    this.offerListChunks(server);
    this.offerGetChunk(server);
    this.offerSearchChunks(server);
    this.offerListWords(server);
    this.offerGetWord(server);
    this.offerFindDuplicates(server);
    this.offerFindDangling(server);
    this.offerLintUniverse(server);
    this.offerAddChunks(server);
    this.offerDeleteChunk(server);

    return server;
  }

  private offerListChunks(server: McpServer): void {
    server.registerTool(
      "list_chunks",
      {
        description:
          "The chunks of a project's universe, oldest first, a window at a time. " +
          "A chunk is the whole unit here: nothing records which file it came from, " +
          "and nothing about it can be edited — a wording is replaced by deleting it and adding another.",
        inputSchema: {
          from: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Where to start, counted from the oldest chunk"),
          limit: listSize(CHUNKS_SHOWN, "chunks"),
          project: PROJECT,
        },
        title: "Read a universe",
      },
      async ({ from, limit, project }, extra) =>
        said(
          await this.listing.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            {
              from,
              limit,
            },
          ),
        ),
    );
  }

  private offerGetChunk(server: McpServer): void {
    server.registerTool(
      "get_chunk",
      {
        description:
          "One chunk: its text, when it arrived, and its words with the number of other chunks holding each. " +
          "The words come rarest first, so the top of the list is what this chunk alone says; " +
          "a chunk whose every word is at zero is a hanging one.",
        inputSchema: {
          id: z.string().min(1).describe("The chunk's id, as it was listed"),
          limit: listSize(WORDS_IN_CHUNK, "words"),
          project: PROJECT,
        },
        title: "Read one chunk and what ties it to the rest",
      },
      async ({ id, limit, project }, extra) =>
        said(
          await this.chunk.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            id,
            limit,
          ),
        ),
    );
  }

  private offerSearchChunks(server: McpServer): void {
    server.registerTool(
      "search_chunks",
      {
        description:
          "Chunks holding every word of a query, the same search a person types into the field. " +
          "A whole word matches in any of its forms, a fragment matches the words it is part of, " +
          "and nothing is ranked: a chunk either holds the whole query or is not a hit.",
        inputSchema: {
          limit: listSize(HITS_SHOWN, "hits"),
          project: PROJECT,
          query: z
            .string()
            .min(1)
            .describe("One or more words, whole or in part"),
        },
        title: "Search a universe",
      },
      async ({ limit, project, query }, extra) =>
        said(
          await this.search.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            query,
            limit,
          ),
        ),
    );
  }

  private offerListWords(server: McpServer): void {
    server.registerTool(
      "list_words",
      {
        description:
          "The vocabulary of a universe with the number of chunks each word appears in, commonest first. " +
          "One row per word rather than per spelling: forms of one word are one word here, " +
          "so a count counts meanings, not wordings.",
        inputSchema: {
          from: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Where to start, counted from the commonest word"),
          limit: listSize(WORDS_SHOWN, "words"),
          project: PROJECT,
        },
        title: "Read the vocabulary of a universe",
      },
      async ({ from, limit, project }, extra) =>
        said(
          await this.words.run(personOf(extra.authInfo, READ_SCOPE), project, {
            from,
            limit,
          }),
        ),
    );
  }

  private offerGetWord(server: McpServer): void {
    server.registerTool(
      "get_word",
      {
        description:
          "One word: the words it keeps company with, and the chunks it appears in with their text. " +
          "Write it however it is written in the text — any form reaches the same word. " +
          "The company is what says whether a word means one thing across a universe or two.",
        inputSchema: {
          limit: listSize(OCCURRENCES_SHOWN, "chunks"),
          project: PROJECT,
          word: z.string().min(1).describe("A word, in any of its forms"),
        },
        title: "Read one word of a universe",
      },
      async ({ limit, project, word }, extra) =>
        said(
          await this.word.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            word,
            limit,
          ),
        ),
    );
  }

  private offerFindDuplicates(server: McpServer): void {
    server.registerTool(
      "find_duplicates",
      {
        description:
          "Pairs of chunks in a project's universe that say the same thing, strongest first. " +
          `Levels: ${LEVELS_SAID}. ` +
          "A pair marked as a disagreement is not a repeat: one of the two denies the other, " +
          "and deleting either would silently flip a rule.",
        inputSchema: {
          level: z
            .enum(LEVEL_IDS)
            .default("almost")
            .describe("How alike two chunks must be to count as a repeat"),
          limit: listSize(PAIRS_SHOWN, "pairs"),
          project: PROJECT,
        },
        title: "Find repeats in a universe",
      },
      async ({ level, limit, project }, extra) =>
        said(
          await this.duplicates.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            level,
            limit,
          ),
        ),
    );
  }

  private offerFindDangling(server: McpServer): void {
    server.registerTool(
      "find_dangling_chunks",
      {
        description:
          "Chunks not one of whose words appears anywhere else in the universe. " +
          "Hanging is not the same as spare: a chunk hangs both when it is a leftover and " +
          "when it is the only place something is said, and the text is there to tell the two apart.",
        inputSchema: {
          limit: listSize(HANGING_SHOWN, "chunks"),
          project: PROJECT,
        },
        title: "Find chunks nothing links to",
      },
      async ({ limit, project }, extra) =>
        said(
          await this.dangling.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            limit,
          ),
        ),
    );
  }

  private offerLintUniverse(server: McpServer): void {
    server.registerTool(
      "lint_universe",
      {
        description:
          "Vale, textlint, proselint and Harper over the whole universe, remarks gathered under the chunk they were written on. " +
          "A pass reads every chunk and keeps nothing: the next one starts from nothing again, " +
          "and if the linters are offline the answer says so rather than passing the universe as clean.",
        inputSchema: {
          limit: listSize(FLAGGED_SHOWN, "flagged chunks"),
          project: PROJECT,
        },
        title: "Run the linters over a universe",
      },
      async ({ limit, project }, extra) =>
        said(
          await this.linters.run(
            personOf(extra.authInfo, READ_SCOPE),
            project,
            limit,
          ),
        ),
    );
  }

  private offerAddChunks(server: McpServer): void {
    server.registerTool(
      "add_chunks",
      {
        annotations: { destructiveHint: false, readOnlyHint: false },
        description:
          "Cuts a sheet of text into chunks and adds them to a project, the same cut the browser makes. " +
          "The text itself is not stored and no chunk remembers it — what comes back are the new chunks under their ids.",
        inputSchema: {
          format: z
            .enum(["markdown", "text"])
            .optional()
            .describe("How to read the text; guessed from it when left out"),
          limit: listSize(ADDED_SHOWN, "new chunks"),
          project: PROJECT,
          text: z
            .string()
            .min(1)
            .max(200000)
            .describe("Markdown or plain text, as long as a sheet"),
        },
        title: "Add text to a universe",
      },
      async ({ format, limit, project, text }, extra) =>
        said(
          await this.adding.run(
            personOf(extra.authInfo, WRITE_SCOPE),
            project,
            text,
            format,
            limit,
          ),
        ),
    );
  }

  private offerDeleteChunk(server: McpServer): void {
    server.registerTool(
      "delete_chunk",
      {
        annotations: { destructiveHint: true, idempotentHint: false },
        description:
          "Removes one chunk from a project, by the id another tool named. There is no undo and no edit: " +
          "a wording is corrected by deleting it and adding the one that replaces it. " +
          "Never resolve a pair marked as a disagreement this way — deleting either side flips what the universe says.",
        inputSchema: {
          id: z.string().min(1).describe("The chunk's id, as it was listed"),
          project: PROJECT,
        },
        title: "Delete a chunk",
      },
      async ({ id, project }, extra) =>
        said(
          await this.deleting.run(
            personOf(extra.authInfo, WRITE_SCOPE),
            project,
            id,
          ),
        ),
    );
  }
}
