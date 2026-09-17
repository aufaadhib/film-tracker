import assert from "node:assert/strict";
import sync from "../sync.js";

assert.equal(sync.normalizePairCode("abcd-2345"), "ABCD2345");
assert.equal(sync.normalizePairCode("IO10 abcd"), "ABCD");

const prepared = sync.prepareWatchedItem({ title: "Interstellar" }, "event-id");
assert.equal(prepared.eventId, "event-id");
assert.equal(sync.prepareWatchedItem(prepared, "other-id").eventId, "event-id");

assert.deepEqual(sync.listInProgress({
  older: { title: " Arrival ", provider: "netflix", coverage: 24.4, updatedAt: "2026-09-17T10:00:00.000Z" },
  newer: { title: "Dune", provider: "max", coverage: 48.8, updatedAt: "2026-09-17T12:00:00.000Z" },
}), [
  { title: "Dune", provider: "max", coverage: 49, updatedAt: "2026-09-17T12:00:00.000Z" },
  { title: "Arrival", provider: "netflix", coverage: 24, updatedAt: "2026-09-17T10:00:00.000Z" },
]);

assert.deepEqual(sync.toSyncPayload({
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  coverage: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
}), {
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  url: null,
  duration: null,
  coverage: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
});

console.log("sync tests passed");
