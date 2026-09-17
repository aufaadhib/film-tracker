(function exposeCoverage(root) {
  function bucketFor(time, bucketSize = 10) {
    return Math.floor(Math.max(0, time) / bucketSize);
  }

  function coveragePercent(buckets, duration, bucketSize = 10) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    const totalBuckets = Math.ceil(duration / bucketSize);
    return Math.min(100, Math.round((new Set(buckets).size / totalBuckets) * 10000) / 100);
  }

  const api = { bucketFor, coveragePercent };
  root.ReelCoverage = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
