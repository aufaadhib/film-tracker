import assert from "node:assert/strict";
import coverage from "../coverage.js";

const { playbackPercent, isWatchedPosition, shouldRecordCompletion } = coverage;

assert.equal(playbackPercent(1320, 2640), 50);
assert.equal(playbackPercent(3000, 2640), 100);
assert.equal(playbackPercent(Number.NaN, 2640), 0);
assert.equal(isWatchedPosition(79), false);
assert.equal(isWatchedPosition(80), true);
assert.equal(shouldRecordCompletion(80, false, false), true);
assert.equal(shouldRecordCompletion(80, true, false), false);
assert.equal(shouldRecordCompletion(80, true, true), true);
assert.equal(shouldRecordCompletion(79, true, true), false);

console.log("coverage tests passed");
