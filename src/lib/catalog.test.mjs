import assert from "node:assert/strict";
import { formatDisplayTitle, groupWatchedTitles, normalizeSeriesStatus, seriesStatusLabel } from "./catalog.ts";

assert.equal(formatDisplayTitle("Interstellar", "Interstellar"), "Interstellar");
assert.equal(
  formatDisplayTitle("The King: Eternal Monarch", "더 킹 : 영원의 군주"),
  "The King: Eternal Monarch (더 킹 : 영원의 군주)",
);
assert.equal(formatDisplayTitle("  Parasite  ", null), "Parasite");
assert.equal(normalizeSeriesStatus("Returning Series", false), "ongoing");
assert.equal(normalizeSeriesStatus("Ended", false), "ended");
assert.equal(normalizeSeriesStatus("Planned", false), "upcoming");
assert.equal(normalizeSeriesStatus("Unknown", false), null);
assert.equal(seriesStatusLabel("ongoing"), "MASIH TAYANG");

const movie = { id: "movie", title: "Dune", mediaType: "movie", episodeNumber: null };
const episode2 = { id: "e2", title: "Perfect Crown", mediaType: "tv", year: 2026, seasonNumber: 1, episodeNumber: 2 };
const episode1 = { id: "e1", title: "Perfect Crown", mediaType: "tv", year: 2026, seasonNumber: 1, episodeNumber: 1 };
assert.deepEqual(groupWatchedTitles([episode2, movie, episode1]), [
  { kind: "series", key: "perfect crown:2026", items: [episode2, episode1] },
  { kind: "item", item: movie },
]);

console.log("catalog title tests passed");
