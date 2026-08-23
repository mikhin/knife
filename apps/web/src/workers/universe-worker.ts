import {
  buildUniverseIndex,
  describeWord,
  findDanglingChunks,
  findDuplicatePairs,
  listWords,
  searchUniverse,
} from "@knife/universe";
import type { UniverseIndex } from "@knife/universe";
import type { WorkerRequest, WorkerResponse } from "@/types/worker";

/**
 * The index lives here and nowhere else: off the main thread so tens of
 * thousands of chunks never freeze the graph, and out of the database so a
 * verdict can never outlive the text it judged.
 */
let index: undefined | UniverseIndex;

const post = (response: WorkerResponse): void => {
  self.postMessage(response);
};

const analyse = (
  request: Extract<WorkerRequest, { type: "analyse" }>,
): void => {
  index = buildUniverseIndex(request.chunks);

  post({
    report: {
      dangling: findDanglingChunks(index),
      duplicates: findDuplicatePairs(index),
      words: listWords(index),
    },
    type: "analysed",
  });
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "analyse") {
    analyse(request);
    return;
  }

  if (!index) {
    return;
  }

  if (request.type === "search") {
    post({
      hits: searchUniverse(index, request.query),
      query: request.query,
      type: "search",
    });
    return;
  }

  post({ profile: describeWord(index, request.stem), type: "word" });
});
