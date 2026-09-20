import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "../config.js";
import sync from "../sync.js";

assert.equal(sync.apiBase, "https://reelmark.afana.id");

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
assert.equal(sync.formatEpisodeTitle("Perfect Crown", 1, 2, "Episode 2"), "Perfect Crown · S1:E2");
assert.equal(sync.formatEpisodeTitle("Perfect Crown", 1, 2, "The Choice"), "Perfect Crown · S1:E2 · The Choice");
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
  sync.sessionIdentity("disney", "Perfect Crown", "https://disneyplus.com/en-gb/play/c796dcaa", 1, 2),
  "disney:https://disneyplus.com/en-gb/play/c796dcaa:s1e2",
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

const progressNow = Date.parse("2026-09-17T12:00:20.000Z");
assert.deepEqual(sync.listInProgress({
  invalid: { title: "Netflix", provider: "netflix", progress: 0, updatedAt: "2026-09-17T13:00:00.000Z" },
  dismissed: { title: "Tenet", provider: "netflix", progress: 44, dismissed: true, updatedAt: "2026-09-17T14:00:00.000Z" },
  notification: { title: "(31) Netflix", provider: "netflix", progress: 11, updatedAt: "2026-09-17T13:00:00.000Z" },
  older: { title: " Le roi ", displayTitle: "The King: Eternal Monarch", originalTitle: "더 킹 : 영원의 군주", provider: "netflix", progress: 51.2, updatedAt: "2026-09-17T10:00:00.000Z" },
  newer: { title: "Dune", provider: "max", progress: 72.6, playing: true, updatedAt: "2026-09-17T12:00:00.000Z" },
}, progressNow), [
  { title: "Dune", provider: "max", progress: 73, updatedAt: "2026-09-17T12:00:00.000Z", active: true },
  { title: "The King: Eternal Monarch (더 킹 : 영원의 군주)", provider: "netflix", progress: 51, updatedAt: "2026-09-17T10:00:00.000Z", active: false },
]);
assert.equal(sync.isActiveSession({ playing: true, updatedAt: "2026-09-17T11:59:49.000Z" }, progressNow), false);
assert.equal(sync.isActiveSession({ playing: false, updatedAt: "2026-09-17T12:00:19.000Z" }, progressNow), false);

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
  seasonNumber: null,
  episodeNumber: null,
  episodeTitle: null,
  url: null,
  duration: null,
  progress: 80,
  watchedAt: "2026-09-17T12:00:00.000Z",
});
assert.equal(sync.toSyncPayload({ coverage: 82 }).progress, 82);
assert.equal(sync.toSyncPayload({ progress: 7 }).progress, 7);
assert.equal(sync.toSyncPayload({}).progress, 80);
assert.equal(sync.toSyncPayload({ duration: 86_401 }).duration, null);
const repairedEpisode = sync.toSyncPayload({ seasonNumber: 1, episodeNumber: null, episodeTitle: "Rusak" });
assert.equal(repairedEpisode.seasonNumber, null);
assert.equal(repairedEpisode.episodeNumber, null);
assert.equal(repairedEpisode.episodeTitle, null);
assert.deepEqual(sync.toSyncPayload({
  eventId: "episode-event-id",
  provider: "netflix",
  title: "The Early Spring",
  seasonNumber: 1,
  episodeNumber: 4,
  episodeTitle: "Ikut Aku Pulang",
  progress: 80,
  watchedAt: "2026-09-18T12:00:00.000Z",
}), {
  eventId: "episode-event-id",
  provider: "netflix",
  title: "The Early Spring",
  canonicalTitle: null,
  originalTitle: null,
  seasonNumber: 1,
  episodeNumber: 4,
  episodeTitle: "Ikut Aku Pulang",
  url: null,
  duration: null,
  progress: 80,
  watchedAt: "2026-09-18T12:00:00.000Z",
});

assert.deepEqual(sync.toProgressPayload({
  eventId: "event-id",
  provider: "netflix",
  title: "Interstellar",
  displayTitle: "Interstellar (2014)",
  originalTitle: "Interstellar",
  seasonNumber: null,
  episodeNumber: null,
  episodeTitle: null,
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
  seasonNumber: null,
  episodeNumber: null,
  episodeTitle: null,
  url: "https://www.netflix.com/watch/1",
  duration: 2400,
  currentTime: 1200,
  progress: 50,
  observedAt: "2026-09-17T12:00:00.000Z",
});
assert.equal(sync.toProgressPayload({ duration: 86_401, currentTime: 10 }), null);

const netflixMetadataDataset = {};
runInNewContext(readFileSync(new URL("../netflix-metadata.js", import.meta.url), "utf8"), {
  document: { documentElement: { dataset: netflixMetadataDataset } },
  location: { pathname: "/watch/81441350" },
  netflix: {
    appContext: {
      state: {
        playerApp: {
          getAPI: () => ({
            getPlayableDataByVideoId: () => ({ summary: { type: "episode", season: 2, episode: 2 } }),
            videoPlayer: {
              getAllPlayerSessionIds: () => ["watch-session"],
              getVideoPlayerBySessionId: () => ({ getMovieId: () => 81441350 }),
            },
          }),
        },
      },
    },
  },
  window: { setInterval() {} },
});
assert.deepEqual(JSON.parse(netflixMetadataDataset.reelmarkNetflixMetadata), {
  videoId: 81441350,
  type: "episode",
  seasonNumber: 2,
  episodeNumber: 2,
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
const disneyListeners = {};
let disneyScan;
let disneyEpisodeText = "S1:E1 Episode 1";
const disneyVideo = {
  duration: Infinity,
  currentTime: 10,
  paused: false,
  seekable: { length: 1, start: () => 0, end: () => 12 },
  clientWidth: 1280,
  clientHeight: 720,
  getAttribute: (name) => name === "aria-label" ? "Perfect Crown" : null,
  addEventListener(name, listener) { disneyListeners[name] = listener; },
  removeEventListener() {},
};
const disneyShadowRoot = {
  querySelector: (selector) => {
    if (selector === "video[aria-label]") return disneyVideo;
    if (selector === "h1") return { textContent: "Up Next" };
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === "video") return [disneyVideo];
    if (selector.includes('[role="slider"]')) return [];
    if (selector === '[data-qa="title-bug.subtitle"]') return [{
        get textContent() { return disneyEpisodeText; },
        getAttribute: () => null,
      }];
    if (selector.includes('[data-uia="video-title"]')) return [{
      textContent: "S1:E2 Episode 2",
      className: "episode-title pivot-tray",
      getAttribute: () => null,
    }];
    if (selector.includes("time, span")) return [
      {
        textContent: "21:22",
        className: "current-time",
        getAttribute: () => null,
      },
      {
        textContent: "21:36",
        className: "preview-time",
        getAttribute: () => null,
      },
      {
        textContent: "46:17",
        className: "duration-time",
        getAttribute: () => null,
      },
    ];
    return [];
  },
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
  navigator: { mediaSession: { metadata: { album: "S1:E2 Episode 2" } } },
  ReelSync: sync,
  window: { setInterval: (callback) => { disneyScan = callback; return 8; }, clearInterval() {} },
});
assert.equal(disneyHeartbeats[0]?.type, "HEARTBEAT");
assert.equal(disneyHeartbeats[0]?.payload.title, "Perfect Crown");
assert.equal(disneyHeartbeats[0]?.payload.seasonNumber, 1);
assert.equal(disneyHeartbeats[0]?.payload.episodeNumber, 1);
assert.equal(disneyHeartbeats[0]?.payload.currentTime, 1282);
assert.equal(disneyHeartbeats[0]?.payload.duration, 2777);
disneyListeners.pause();
assert.equal(disneyHeartbeats.length, 1);
await new Promise(setImmediate);
disneyEpisodeText = "";
disneyScan();
disneyListeners.pause();
assert.equal(disneyHeartbeats.at(-1)?.payload.episodeNumber, 1);
await new Promise(setImmediate);
disneyEpisodeText = "S1:E2 Episode 2";
disneyScan();
assert.equal(disneyHeartbeats.at(-1)?.payload.seasonNumber, 1);
assert.equal(disneyHeartbeats.at(-1)?.payload.episodeNumber, 2);

const currentDisneyHeartbeats = [];
const currentDisneyVideo = {
  duration: Infinity,
  currentTime: 2006,
  paused: false,
  seekable: { length: 1, start: () => 0, end: () => 2760 },
  clientWidth: 1280,
  clientHeight: 720,
  getAttribute: (name) => name === "aria-label" ? "The Judge from Hell" : null,
  addEventListener() {},
  removeEventListener() {},
};
const currentDisneyShadowRoot = {
  querySelector: (selector) => selector === "video[aria-label]" ? currentDisneyVideo : null,
  querySelectorAll: (selector) => {
    if (selector === "video") return [currentDisneyVideo];
    if (selector.includes('[role="slider"]')) return [];
    if (selector.includes('[data-uia="video-title"]')) return [{
      textContent: "S1:E1 EPISODE 1",
      className: "episode-metadata",
      getAttribute: () => null,
    }];
    if (selector.includes("time, span")) return [
      {
        textContent: "12:34",
        className: "remaining-time",
        getAttribute: () => null,
      },
      {
        textContent: "25:00:00",
        className: "duration-time hidden-control",
        getAttribute: () => null,
      },
    ];
    return [];
  },
};
runInNewContext(readFileSync(new URL("../content.js", import.meta.url), "utf8"), {
  chrome: { runtime: { sendMessage(message) { currentDisneyHeartbeats.push(message); return Promise.resolve({}); } } },
  document: {
    title: "The Judge from Hell | Disney+",
    querySelector: () => null,
    querySelectorAll: (selector) => selector === "*" ? [{ shadowRoot: currentDisneyShadowRoot }] : [],
  },
  location: { hostname: "disneyplus.com", href: "https://disneyplus.com/en-gb/play/a38c35d1-3131-4e95-8b19-e701aabe6f17" },
  navigator: {},
  ReelSync: sync,
  window: { setInterval: () => 10, clearInterval() {} },
});
assert.equal(currentDisneyHeartbeats[0]?.type, "HEARTBEAT");
assert.equal(currentDisneyHeartbeats[0]?.payload.title, "The Judge from Hell");
assert.equal(currentDisneyHeartbeats[0]?.payload.seasonNumber, 1);
assert.equal(currentDisneyHeartbeats[0]?.payload.episodeNumber, 1);
assert.equal(currentDisneyHeartbeats[0]?.payload.currentTime, 2006);
assert.equal(currentDisneyHeartbeats[0]?.payload.duration, 2760);

const netflixHeartbeats = [];
const netflixVideo = {
  duration: 2700,
  currentTime: 900,
  paused: false,
  clientWidth: 1280,
  clientHeight: 720,
  addEventListener() {},
  removeEventListener() {},
};
const netflixTitleContainer = {
  textContent: "Four Hands, Two SonatasE1Episode 1",
  className: "",
  getAttribute: () => null,
};
const netflixTitle = {
  textContent: "Four Hands, Two Sonatas",
  className: "",
  parentElement: netflixTitleContainer,
  getAttribute: () => null,
};
const netflixSeasonHeading = {
  textContent: "Season 1",
  hidden: false,
  getAttribute: () => null,
  getClientRects: () => [{}],
};
const netflixDocument = {
  documentElement: {
    dataset: {
      reelmarkNetflixMetadata: JSON.stringify({
        videoId: 81766333,
        type: "episode",
        seasonNumber: 2,
        episodeNumber: 1,
      }),
    },
  },
  title: "Four Hands, Two Sonatas - Netflix",
  querySelector: (selector) => selector === '[data-uia="video-title"] h4'
    ? netflixTitle
    : null,
  querySelectorAll: (selector) => {
    if (selector === "video") return [netflixVideo];
    if (selector.endsWith(", div, span")) return [netflixSeasonHeading];
    if (selector.includes('[data-uia="video-title"]')) return [netflixTitle];
    if (selector.includes("time, span")) return [
      { textContent: "00:50", className: "current-time", getAttribute: () => null },
      { textContent: "12:33", className: "duration-time", getAttribute: () => null },
    ];
    return [];
  },
};
runInNewContext(readFileSync(new URL("../content.js", import.meta.url), "utf8"), {
  chrome: { runtime: { sendMessage(message) { netflixHeartbeats.push(message); return Promise.resolve({}); } } },
  document: netflixDocument,
  location: { hostname: "www.netflix.com", pathname: "/watch/81766333", href: "https://www.netflix.com/watch/81766333" },
  navigator: { mediaSession: { metadata: { album: "Season 1" } } },
  ReelSync: sync,
  window: { setInterval: () => 9, clearInterval() {} },
});
assert.equal(netflixHeartbeats[0]?.type, "HEARTBEAT");
assert.equal(netflixHeartbeats[0]?.payload.title, "Four Hands, Two Sonatas");
assert.equal(netflixHeartbeats[0]?.payload.seasonNumber, 2);
assert.equal(netflixHeartbeats[0]?.payload.episodeNumber, 1);
assert.equal(netflixHeartbeats[0]?.payload.episodeTitle, "Episode 1");
assert.equal(netflixHeartbeats[0]?.payload.currentTime, 900);
assert.equal(netflixHeartbeats[0]?.payload.duration, 2700);

function runPrimeVideoPage({ visible, playback, timeline, playerTitle = "Reacher", documentTitle = "Prime Video: Reacher" }) {
  const heartbeats = [];
  const currentIndicator = { textContent: "33:00" };
  const remainingIndicator = { textContent: "14:27" };
  const playerRoot = {
    querySelector: (selector) => ({
      "#atvwebplayersdk-time-indicator": currentIndicator,
      "#atvwebplayersdk-time-remaining-indicator": remainingIndicator,
    })[selector] ?? null,
    querySelectorAll: () => [],
  };
  const createVideo = ({ inPlayer, width }) => ({
    duration: inPlayer ? Number.POSITIVE_INFINITY : 120,
    currentTime: inPlayer ? 1980 : 1,
    paused: false,
    clientWidth: visible ? width : 0,
    clientHeight: visible ? 720 : 0,
    hidden: false,
    getClientRects: () => visible ? [{}] : [],
    getAttribute: (name) => ({ "aria-label": "Reacher", "aria-hidden": "true" })[name] ?? null,
    closest: (selector) => {
      if (selector.includes("draper-player")) return inPlayer ? null : {};
      if (selector === "#dv-web-player") return inPlayer ? playerRoot : null;
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
  });
  const previewVideo = createVideo({ inPlayer: false, width: 1920 });
  const primeVideo = createVideo({ inPlayer: true, width: 1280 });
  const title = playerTitle ? { textContent: playerTitle, getAttribute: () => null } : null;
  const episode = { textContent: "S4 E5 Bridge" };
  const document = {
    title: documentTitle,
    querySelector: (selector) => selector === ".atvwebplayersdk-title-text" ? title : null,
    querySelectorAll: (selector) => {
      if (selector === "video") return playback ? [previewVideo, primeVideo] : [previewVideo];
      if (selector === ".atvwebplayersdk-episode-info") return [episode];
      return [];
    },
  };
  if (!timeline) playerRoot.querySelector = () => null;
  runInNewContext(readFileSync(new URL("../content.js", import.meta.url), "utf8"), {
    chrome: { runtime: { sendMessage(message) { heartbeats.push(message); return Promise.resolve({}); } } },
    document,
    location: {
      hostname: "www.primevideo.com",
      href: "https://www.primevideo.com/region/eu/detail/0K16R3PLUFGC2JUE457C26O4OD",
    },
    navigator: {},
    ReelSync: sync,
    window: { setInterval: () => 11, clearInterval() {} },
  });
  return heartbeats;
}

assert.equal(runPrimeVideoPage({ visible: false, playback: true, timeline: true }).length, 0);
assert.equal(runPrimeVideoPage({ visible: true, playback: false, timeline: true }).length, 0);
assert.equal(runPrimeVideoPage({ visible: true, playback: true, timeline: false }).length, 0);
const primePlaybackHeartbeats = runPrimeVideoPage({ visible: true, playback: true, timeline: true });
assert.equal(primePlaybackHeartbeats[0]?.type, "HEARTBEAT");
assert.equal(primePlaybackHeartbeats[0]?.payload.title, "Reacher");
assert.equal(primePlaybackHeartbeats[0]?.payload.seasonNumber, 4);
assert.equal(primePlaybackHeartbeats[0]?.payload.episodeNumber, 5);
assert.equal(primePlaybackHeartbeats[0]?.payload.episodeTitle, "Bridge");
assert.equal(primePlaybackHeartbeats[0]?.payload.currentTime, 1980);
assert.equal(primePlaybackHeartbeats[0]?.payload.duration, 2847);
const primeFallbackHeartbeats = runPrimeVideoPage({
  visible: true,
  playback: true,
  timeline: true,
  playerTitle: null,
  documentTitle: "Prime Video: Crime 101",
});
assert.equal(primeFallbackHeartbeats[0]?.payload.title, "Crime 101");
const primeSeasonFallbackHeartbeats = runPrimeVideoPage({
  visible: true,
  playback: true,
  timeline: true,
  playerTitle: null,
  documentTitle: "Prime Video: The Lord of the Rings: The Rings of Power - Season 2",
});
assert.equal(primeSeasonFallbackHeartbeats.length, 0);

console.log("sync tests passed");
