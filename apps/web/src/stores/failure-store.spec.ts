import { beforeEach, describe, expect, it } from "vitest";
import { $failure, attempt } from "@/stores/failure-store";

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("attempt", () => {
  beforeEach(() => {
    $failure.set(undefined);
  });

  it("says what went wrong", async () => {
    attempt(Promise.reject(new Error("Project already exists")));
    await settle();

    expect($failure.get()).toBe("Project already exists");
  });

  it("keeps quiet when the action worked", async () => {
    attempt(Promise.resolve("done"));
    await settle();

    expect($failure.get()).toBeUndefined();
  });

  it("clears a message the next action started after", async () => {
    attempt(Promise.reject(new Error("first failed")));
    await settle();

    attempt(Promise.resolve("recovered"));
    await settle();

    expect($failure.get()).toBeUndefined();
  });

  it("keeps the message on screen while the next action is still running", async () => {
    attempt(Promise.reject(new Error("delete failed")));
    await settle();

    const running = Promise.withResolvers<string>();
    attempt(running.promise);
    await settle();

    expect($failure.get()).toBe("delete failed");

    running.resolve("done");
    await settle();

    expect($failure.get()).toBeUndefined();
  });

  it("does not let a slower success erase a fresher failure", async () => {
    const slow = Promise.withResolvers<string>();

    attempt(slow.promise);
    attempt(Promise.reject(new Error("delete failed")));
    await settle();

    slow.resolve("done");
    await settle();

    expect($failure.get()).toBe("delete failed");
  });

  it("reports a rejection that is not an Error", async () => {
    attempt(Promise.reject("plain string"));
    await settle();

    expect($failure.get()).toBe("plain string");
  });
});
