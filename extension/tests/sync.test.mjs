import assert from "node:assert/strict";
import sync from "../sync.js";

assert.equal(sync.normalizePairCode("abcd-2345"), "ABCD2345");
assert.equal(sync.normalizePairCode("IO10 abcd"), "ABCD");

const prepared = sync.prepareWatchedItem({ title: "Interstellar" }, "event-id");
assert.equal(prepared.eventId, "event-id");
assert.equal(sync.prepareWatchedItem(prepared, "other-id").eventId, "event-id");

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
