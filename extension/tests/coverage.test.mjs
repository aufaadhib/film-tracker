import assert from "node:assert/strict";
import coverage from "../coverage.js";

const { playbackPercent, isWatchedPosition, shouldRecordCompletion } = coverage;

assert.equal(playbackPercent(1320, 2640), 50);
assert.equal(playbackPercent(3000, 2640), 100);
assert.equal(playbackPercent(Number.NaN, 2640), 0);
assert.equal(isWatchedPosition(79), false);
assert.equal(isWatchedPosition(80), true);
assert.equal(isWatchedPosition(69, 70), false);
assert.equal(isWatchedPosition(70, 70), true);
assert.equal(coverage.normalizeCompletionThreshold(49), 80);
assert.equal(coverage.normalizeCompletionThreshold(95), 95);
assert.equal(shouldRecordCompletion(93, 93, false), true);
assert.equal(shouldRecordCompletion(85, Number.NaN, false), true);
assert.equal(shouldRecordCompletion(93, Number.NaN, true), false);
assert.equal(shouldRecordCompletion(80, 44, true), true);
assert.equal(shouldRecordCompletion(79, 44, false), false);
assert.equal(shouldRecordCompletion(70, 44, false, 70), true);
assert.equal(shouldRecordCompletion(70, 44, false, 90), false);

console.log("coverage tests passed");
