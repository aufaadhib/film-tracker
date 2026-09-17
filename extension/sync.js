(function exposeSync(root) {
  const apiBase = "http://localhost:3000";

  function normalizePairCode(value) {
    return String(value ?? "").toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
  }

  function prepareWatchedItem(item, eventId) {
    return item.eventId ? item : { ...item, eventId };
  }

  function listInProgress(sessions) {
    return Object.values(sessions ?? {})
      .filter((item) => item && typeof item.title === "string" && item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        provider: item.provider,
        coverage: Math.max(0, Math.min(100, Math.round(Number(item.coverage) || 0))),
        updatedAt: item.updatedAt ?? "",
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function toSyncPayload(item) {
    return {
      eventId: item.eventId,
      provider: item.provider,
      title: item.title,
      url: item.url ?? null,
      duration: Number.isInteger(item.duration) && item.duration > 0 ? item.duration : null,
      coverage: item.coverage,
      watchedAt: item.watchedAt,
    };
  }

  const api = { apiBase, normalizePairCode, prepareWatchedItem, listInProgress, toSyncPayload };
  root.ReelSync = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
