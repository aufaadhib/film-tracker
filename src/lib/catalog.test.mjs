import assert from "node:assert/strict";
import { formatDisplayTitle } from "./catalog.ts";

assert.equal(formatDisplayTitle("Interstellar", "Interstellar"), "Interstellar");
assert.equal(
  formatDisplayTitle("The King: Eternal Monarch", "더 킹 : 영원의 군주"),
  "The King: Eternal Monarch (더 킹 : 영원의 군주)",
);
assert.equal(formatDisplayTitle("  Parasite  ", null), "Parasite");

console.log("catalog title tests passed");
