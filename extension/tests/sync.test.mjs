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
assert.equal(
  sync.formatTitle("The King: Eternal Monarch", "더 킹 : 영원의 군주"),
  "The King: Eternal Monarch (더 킹 : 영원의 군주)",
);
assert.equal(sync.formatTitle("Interstellar", "Interstellar"), "Interstellar");
assert.equal(sync.shouldRestartDismissed({ dismissed: true }, true), true);
assert.equal(sync.shouldRestartDismissed({ dismissed: true }, false), false);
assert.equal(sync.shouldRestartDismissed({ dismissed: false }, true), false);
assert.equal(sync.isTrackablePlayback("netflix", "https://www.netflix.com/watch/81260288?trackId=1"), true);
assert.equal(sync.isTrackablePlayback("netflix", "https://www.netflix.com/title/81260288"), false);
assert.equal(sync.isTrackablePlayback("netflix", "https://www.netflix.com/browse"), false);
assert.equal(sync.isTrackablePlayback("disney", "https://disneyplus.com/en-gb/play/c796dcaa-8447-4d43-a48a-aeeca5a77fed"), true);
assert.equal(sync.isTrackablePlayback("disney", "https://www.disneyplus.com/play/c796dcaa-8447-4d43-a48a-aeeca5a77fed"), true);
assert.equal(sync.isTrackablePlayback("disney", "https://disneyplus.com/en-gb/browse"), false);
assert.equal(sync.isTrackablePlayback("prime_video", "https://www.primevideo.com/region/eu/detail/0FWBA4ZZ4OHAET1EXUKL4ESPS7/ref=player"), true);
assert.equal(sync.isTrackablePlayback("prime_video", "https://www.primevideo.com/storefront"), false);
assert.equal(
  sync.sessionIdentity("netflix", "Le roi : monarque éternel", "https://www.netflix.com/watch/81260288?trackId=1"),
  "netflix:https://www.netflix.com/watch/81260288",
);
assert.equal(sync.sessionIdentity("netflix", "더 킹", null), "netflix:더 킹");
assert.equal(sync.sessionIdentity("netflix", "더 킹", "https://example.com/watch/81260288"), "netflix:더 킹");
assert.equal(
  sync.sessionIdentity("disney", "Perfect Crown", "https://www.disneyplus.com/en-gb/play/c796dcaa?x=1"),
  "disney:https://disneyplus.com/en-gb/play/c796dcaa",
);
assert.equal(
  sync.sessionIdentity("disney", "Perfect Crown", "https://disneyplus.com/en-gb/play/c796dcaa"),
  "disney:https://disneyplus.com/en-gb/play/c796dcaa",
);
assert.equal(
  sync.sessionIdentity("prime_video", "Neagley", "https://www.primevideo.com/region/eu/detail/0FWBA4ZZ4OHAET1EXUKL4ESPS7/ref=atv_plr_landingpage_play"),
  "prime_video:https://www.primevideo.com/detail/0FWBA4ZZ4OHAET1EXUKL4ESPS7",
);
assert.equal(
  sync.sessionIdentity("prime_video", "Neagley", "https://www.primevideo.com/detail/0FWBA4ZZ4OHAET1EXUKL4ESPS7/ref=other"),
  "prime_video:https://www.primevideo.com/detail/0FWBA4ZZ4OHAET1EXUKL4ESPS7",
);
const legacySessions = {
  "netflix:le roi": {
    provider: "netflix",
    title: "Le roi",
    url: "https://www.netflix.com/watch/81260288?trackId=1",
    updatedAt: "2026-09-17T12:00:00.000Z",
  },
};
assert.deepEqual(sync.normalizeSessionKeys(legacySessions), {
  "netflix:https://www.netflix.com/watch/81260288": legacySessions["netflix:le roi"],
});

assert.deepEqual(sync.listInProgress({
  invalid: { title: "Netflix", provider: "netflix", progress: 0, updatedAt: "2026-09-17T13:00:00.000Z" },
  dismissed: { title: "Tenet", provider: "netflix", progress: 44, dismissed: true, updatedAt: "2026-09-17T14:00:00.000Z" },
  notification: { title: "(31) Netflix", provider: "netflix", progress: 11, updatedAt: "2026-09-17T13:00:00.000Z" },
  older: { title: " Le roi ", displayTitle: "The King: Eternal Monarch", originalTitle: "더 킹 : 영원의 군주", provider: "netflix", progress: 51.2, updatedAt: "2026-09-17T10:00:00.000Z" },
  newer: { title: "Dune", provider: "max", progress: 72.6, updatedAt: "2026-09-17T12:00:00.000Z" },
}), [
  { title: "Dune", provider: "max", progress: 73, updatedAt: "2026-09-17T12:00:00.000Z" },
  { title: "The King: Eternal Monarch (더 킹 : 영원의 군주)", provider: "netflix", progress: 51, updatedAt: "2026-09-17T10:00:00.000Z" },
]);

assert.deepEqual(sync.toSyncPayload({
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  canonicalTitle: null,
  originalTitle: null,
  progress: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
}), {
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  canonicalTitle: null,
  originalTitle: null,
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
  displayTitle: "Interstellar (2014)",
  originalTitle: "Interstellar",
  url: "https://www.netflix.com/watch/1",
  duration: 2400,
  currentTime: 1200,
  progress: 50,
  updatedAt: "2026-09-17T12:00:00.000Z",
}), {
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  canonicalTitle: "Interstellar (2014)",
  originalTitle: "Interstellar",
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

const disneyHeartbeats = [];
const disneyVideo = {
  duration: Infinity,
  currentTime: 2810,
  paused: false,
  seekable: { length: 1, start: () => 2800, end: () => 4711 },
  clientWidth: 1280,
  clientHeight: 720,
  getAttribute: (name) => name === "aria-label" ? "Perfect Crown" : null,
  addEventListener() {},
  removeEventListener() {},
};
const disneyShadowRoot = {
  querySelector: (selector) => {
    if (selector === "video[aria-label]") return disneyVideo;
    if (selector === "h1") return { textContent: "Up Next" };
    return null;
  },
  querySelectorAll: (selector) => selector === "video" ? [disneyVideo] : [],
};
const disneyDocument = {
  title: "Perfect Crown | Disney+",
  querySelector: () => null,
  querySelectorAll: (selector) => selector === "*" ? [{ shadowRoot: disneyShadowRoot }] : [],
};
runInNewContext(readFileSync(new URL("../content.js", import.meta.url), "utf8"), {
  chrome: { runtime: { sendMessage(message) { disneyHeartbeats.push(message); return Promise.resolve({}); } } },
  document: disneyDocument,
  location: { hostname: "disneyplus.com", href: "https://disneyplus.com/en-gb/play/e1234eda-704c-4729-a47e-e8be088bc61f" },
  navigator: {},
  ReelSync: sync,
  window: { setInterval: () => 8, clearInterval() {} },
});
assert.equal(disneyHeartbeats[0]?.type, "HEARTBEAT");
assert.equal(disneyHeartbeats[0]?.payload.title, "Perfect Crown");
assert.equal(disneyHeartbeats[0]?.payload.currentTime, 10);
assert.equal(disneyHeartbeats[0]?.payload.duration, 1911);

console.log("sync tests passed");
