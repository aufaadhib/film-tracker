import assert from "node:assert/strict";
import { extractNetflixEnglishTitle, parseNetflixWatchUrl } from "./provider-title.ts";

assert.equal(
  extractNetflixEnglishTitle('<meta content="Watch The King: Eternal Monarch | Netflix Official Site" property="og:title">'),
  "The King: Eternal Monarch",
);
assert.equal(
  extractNetflixEnglishTitle("<title>Watch Tom &amp; Jerry | Netflix</title>"),
  "Tom & Jerry",
);
assert.equal(parseNetflixWatchUrl("https://www.netflix.com/watch/81260288?trackId=1")?.pathname, "/watch/81260288");
assert.equal(parseNetflixWatchUrl("https://example.com/watch/81260288"), null);
assert.equal(parseNetflixWatchUrl("https://www.netflix.com/browse"), null);

console.log("provider title tests passed");
