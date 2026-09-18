import assert from "node:assert/strict";
import { formatReleaseDate, getReleaseState, normalizeWatchNetworks, normalizeWatchProviders } from "./watchlist-utils.ts";

const now = new Date("2026-09-18T05:00:00.000Z");
assert.equal(getReleaseState("2026-09-18", now), "released");
assert.equal(getReleaseState("2026-09-19", now), "upcoming");
assert.equal(getReleaseState(null, now), "unknown");
assert.equal(formatReleaseDate("2026-09-19"), "19 September 2026");

assert.deepEqual(normalizeWatchProviders({
  flatrate: [
    { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg", display_priority: 2 },
    { provider_id: 337, provider_name: "Disney Plus", logo_path: "/disney.jpg", display_priority: 1 },
  ],
  free: [
    { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg", display_priority: 2 },
  ],
  ads: [
    { provider_id: 99, provider_name: "Free TV", logo_path: null, display_priority: 3 },
  ],
}), [
  { id: 337, name: "Disney Plus", logoPath: "/disney.jpg", categories: ["flatrate"] },
  { id: 8, name: "Netflix", logoPath: "/netflix.jpg", categories: ["flatrate", "free"] },
  { id: 99, name: "Free TV", logoPath: null, categories: ["ads"] },
]);

assert.deepEqual(normalizeWatchNetworks([
  { id: 3579, name: "Vidio", logo_path: "/vidio.png", origin_country: "ID" },
]), [
  { id: 3579, name: "Vidio", logoPath: "/vidio.png", originCountry: "ID" },
]);

console.log("watchlist tests passed");
