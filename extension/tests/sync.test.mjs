import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import sync from "../sync.js";

assert.equal(sync.normalizePairCode("abcd-2345"), "ABCD2345");
assert.equal(sync.normalizePairCode("IO10 abcd"), "ABCD");

const prepared = sync.prepareWatchedItem({ title: "Interstellar" }, "event-id");
assert.equal(prepared.eventId, "event-id");
assert.equal(sync.prepareWatchedItem(prepared, "other-id").eventId, "event-id");
assert.equal(sync.isUsefulTitle("Netflix", "netflix"), false);
assert.equal(sync.isUsefulTitle("(31) Netflix", "netflix"), false);
assert.equal(sync.isUsefulTitle("Le roi : monarque éternel", "netflix"), true);

assert.deepEqual(sync.listInProgress({
  invalid: { title: "Netflix", provider: "netflix", progress: 0, updatedAt: "2026-09-17T13:00:00.000Z" },
  notification: { title: "(31) Netflix", provider: "netflix", progress: 11, updatedAt: "2026-09-17T13:00:00.000Z" },
  older: { title: " Arrival ", provider: "netflix", progress: 51.2, updatedAt: "2026-09-17T10:00:00.000Z" },
  newer: { title: "Dune", provider: "max", progress: 72.6, updatedAt: "2026-09-17T12:00:00.000Z" },
}), [
  { title: "Dune", provider: "max", progress: 73, updatedAt: "2026-09-17T12:00:00.000Z" },
  { title: "Arrival", provider: "netflix", progress: 51, updatedAt: "2026-09-17T10:00:00.000Z" },
]);

assert.deepEqual(sync.toSyncPayload({
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  progress: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
}), {
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  url: null,
  duration: null,
  progress: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
});
assert.equal(sync.toSyncPayload({ coverage: 82 }).progress, 82);

assert.deepEqual(sync.toProgressPayload({
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  url: "https://www.netflix.com/watch/1",
  duration: 2400,
  currentTime: 1200,
  progress: 50,
  updatedAt: "2026-09-17T12:00:00.000Z",
}), {
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  url: "https://www.netflix.com/watch/1",
  duration: 2400,
  currentTime: 1200,
  progress: 50,
  observedAt: "2026-09-17T12:00:00.000Z",
});

const clearedIntervals = [];
const video = {
  duration: 120,
  currentTime: 30,
  clientWidth: 1280,
  clientHeight: 720,
  addEventListener() {},
  removeEventListener() {},
};
runInNewContext(readFileSync(new URL("../content.js", import.meta.url), "utf8"), {
  chrome: { runtime: { sendMessage() { throw new Error("Extension context invalidated"); } } },
  document: { title: "Interstellar - Netflix", querySelector: () => null, querySelectorAll: () => [video] },
  location: { hostname: "www.netflix.com", href: "https://www.netflix.com/watch/1" },
  ReelSync: sync,
  window: {
    setInterval: () => 7,
    clearInterval: (id) => clearedIntervals.push(id),
  },
});
assert.deepEqual(clearedIntervals, [7]);

console.log("sync tests passed");
