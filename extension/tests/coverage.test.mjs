import assert from "node:assert/strict";
import coverage from "../coverage.js";

const { bucketFor, coveragePercent } = coverage;

assert.equal(bucketFor(0), 0);
assert.equal(bucketFor(19.9), 1);
assert.equal(coveragePercent([0, 1, 1, 2], 100), 30);
assert.equal(coveragePercent([0, 1, 2, 3, 4, 5, 6, 7], 100), 80);
assert.equal(coveragePercent([0], 0), 0);

console.log("coverage tests passed");
