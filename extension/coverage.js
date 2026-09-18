(function exposeCoverage(root) {
  function playbackPercent(currentTime, duration) {
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
  }

  function isWatchedPosition(progress) {
    return Number.isFinite(progress) && progress >= 80;
  }

  function shouldRecordCompletion(progress, previousProgress, previouslyWatched) {
    return isWatchedPosition(progress)
      && (!previouslyWatched
        || (Number.isFinite(previousProgress) && !isWatchedPosition(previousProgress)));
  }

  const api = { playbackPercent, isWatchedPosition, shouldRecordCompletion };
  root.ReelCoverage = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
