(function exposeCoverage(root) {
  const DEFAULT_COMPLETION_THRESHOLD = 80;

  function normalizeCompletionThreshold(value) {
    const threshold = Number(value);
    return Number.isInteger(threshold) && threshold >= 50 && threshold <= 100
      ? threshold
      : DEFAULT_COMPLETION_THRESHOLD;
  }

  function playbackPercent(currentTime, duration) {
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
  }

  function isWatchedPosition(progress, completionThreshold = DEFAULT_COMPLETION_THRESHOLD) {
    return Number.isFinite(progress) && progress >= normalizeCompletionThreshold(completionThreshold);
  }

  function shouldRecordCompletion(progress, previousProgress, previouslyWatched, completionThreshold = DEFAULT_COMPLETION_THRESHOLD) {
    return isWatchedPosition(progress, completionThreshold)
      && (!previouslyWatched
        || (Number.isFinite(previousProgress) && !isWatchedPosition(previousProgress, completionThreshold)));
  }

  const api = { DEFAULT_COMPLETION_THRESHOLD, normalizeCompletionThreshold, playbackPercent, isWatchedPosition, shouldRecordCompletion };
  root.ReelCoverage = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
