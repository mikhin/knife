import { buildUniverseIndex } from "@/services/universe/build-universe-index";
import { buildWordGraph } from "@/services/universe/build-word-graph";
import { describeWord } from "@/services/universe/describe-word";
import { detectWater } from "@/services/universe/detect-water";
import { findDanglingChunks } from "@/services/universe/find-dangling-chunks";
import { findDuplicatePairs } from "@/services/universe/find-duplicate-pairs";
import { searchUniverse } from "@/services/universe/search-universe";
import type { UniverseIndex } from "@/types/universe";
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
      water: detectWater(index),
      wordGraph: buildWordGraph(index),
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
