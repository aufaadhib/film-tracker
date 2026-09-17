(function exposeSync(root) {
  const apiBase = "http://localhost:3000";

  function normalizePairCode(value) {
    return String(value ?? "").toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
  }

  function prepareWatchedItem(item, eventId) {
    return item.eventId ? item : { ...item, eventId };
  }

  function isUsefulTitle(title, provider) {
    const normalized = String(title ?? "").trim().toLocaleLowerCase();
    const withoutNotificationCount = normalized.replace(/^\(\d+\)\s*/, "");
    const genericTitles = {
      netflix: ["netflix"],
      disney: ["disney+", "disney plus"],
      prime_video: ["prime video", "amazon prime video"],
      max: ["max", "hbo max"],
    };
    return Boolean(normalized) && !(genericTitles[provider] ?? []).includes(withoutNotificationCount);
  }

  function formatTitle(title, originalTitle) {
    const localized = String(title ?? "").trim();
    const original = String(originalTitle ?? "").trim();
    if (!original || localized.normalize("NFKC").toLocaleLowerCase() === original.normalize("NFKC").toLocaleLowerCase()) {
      return localized;
    }
    return `${localized} (${original})`;
  }

  function listInProgress(sessions) {
    return Object.values(sessions ?? {})
      .filter((item) => item && !item.dismissed && isUsefulTitle(item.title, item.provider))
      .map((item) => ({
        title: formatTitle(item.displayTitle ?? item.title, item.originalTitle),
        provider: item.provider,
        progress: Math.max(0, Math.min(100, Math.round(Number(item.progress) || 0))),
        updatedAt: item.updatedAt ?? "",
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function shouldRestartDismissed(item, playing) {
    return Boolean(item?.dismissed && playing);
  }

  function isTrackablePlayback(provider, value) {
    if (provider !== "netflix" && provider !== "disney" && provider !== "prime_video") return true;
    try {
      const url = new URL(value);
      if (provider === "netflix") {
        return url.hostname === "www.netflix.com" && /^\/watch\/[^/]+/.test(url.pathname);
      }
      if (provider === "disney") {
        return ["disneyplus.com", "www.disneyplus.com"].includes(url.hostname)
          && /^\/(?:[a-z]{2}-[a-z]{2}\/)?play\/[^/]+/i.test(url.pathname);
      }
      return url.hostname === "www.primevideo.com" && /\/detail\/[^/]+/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  function toSyncPayload(item) {
    return {
      eventId: item.eventId,
      provider: item.provider,
      title: item.title,
      canonicalTitle: item.displayTitle ?? null,
      originalTitle: item.originalTitle ?? null,
      url: item.url ?? null,
      duration: Number.isInteger(item.duration) && item.duration > 0 ? item.duration : null,
      progress: item.progress ?? item.coverage,
      watchedAt: item.watchedAt,
    };
  }

  function toProgressPayload(item) {
    return {
      eventId: item.eventId,
      provider: item.provider,
      title: item.title,
      canonicalTitle: item.displayTitle ?? null,
      originalTitle: item.originalTitle ?? null,
      url: item.url ?? null,
      duration: item.duration,
      currentTime: item.currentTime,
      progress: item.progress,
      observedAt: item.updatedAt,
    };
  }

  function sessionIdentity(provider, title, value) {
    const providerHosts = {
      netflix: ["www.netflix.com"],
      disney: ["disneyplus.com", "www.disneyplus.com"],
      prime_video: ["www.primevideo.com"],
      max: ["play.max.com"],
    };
    try {
      const url = new URL(value);
      const hosts = providerHosts[provider] ?? [];
      if (url.protocol === "https:" && hosts.includes(url.hostname) && url.pathname !== "/") {
        if (provider === "prime_video") {
          const contentId = url.pathname.match(/\/detail\/([^/]+)/i)?.[1];
          if (contentId) return `${provider}:https://${hosts[0]}/detail/${contentId}`;
        }
        return `${provider}:https://${hosts[0]}${url.pathname.replace(/\/$/, "")}`;
      }
    } catch {}
    return `${provider}:${String(title).toLocaleLowerCase().replace(/\s+/g, " ").trim()}`;
  }

  function normalizeSessionKeys(records) {
    let normalized = records ?? {};
    for (const [key, item] of Object.entries(records ?? {})) {
      const expected = sessionIdentity(item.provider, item.title, item.url);
      if (expected === key) continue;
      if (normalized === records) normalized = { ...records };
      const existing = normalized[expected];
      const itemTime = item.updatedAt ?? item.watchedAt ?? "";
      const existingTime = existing?.updatedAt ?? existing?.watchedAt ?? "";
      if (!existing || itemTime >= existingTime) normalized[expected] = item;
      delete normalized[key];
    }
    return normalized;
  }

  const api = { apiBase, normalizePairCode, prepareWatchedItem, isUsefulTitle, formatTitle, listInProgress, shouldRestartDismissed, isTrackablePlayback, toSyncPayload, toProgressPayload, sessionIdentity, normalizeSessionKeys };
  root.ReelSync = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
