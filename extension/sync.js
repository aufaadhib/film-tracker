(function exposeSync(root) {
  const apiBase = root.ReelConfig?.apiBase;
  const ACTIVE_SESSION_WINDOW_MS = 30_000;
  if (!apiBase) throw new Error("Konfigurasi endpoint Reelmark belum dimuat.");

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

  function formatEpisodeTitle(title, seasonNumber, episodeNumber, episodeTitle) {
    const episode = Number.isInteger(seasonNumber) && Number.isInteger(episodeNumber)
      ? `S${seasonNumber}:E${episodeNumber}`
      : "";
    const name = String(episodeTitle ?? "").trim();
    return [title, episode, name && !/^episode\s*\d+$/i.test(name) ? name : ""].filter(Boolean).join(" · ");
  }

  function isActiveSession(item, now = Date.now()) {
    const updatedAt = Date.parse(item?.updatedAt ?? "");
    return Boolean(item?.playing)
      && Number.isFinite(updatedAt)
      && now >= updatedAt
      && now - updatedAt <= ACTIVE_SESSION_WINDOW_MS;
  }

  function listInProgress(sessions, now = Date.now()) {
    return Object.values(sessions ?? {})
      .filter((item) => item && !item.dismissed && isUsefulTitle(item.title, item.provider))
      .map((item) => ({
        title: formatEpisodeTitle(
          formatTitle(item.displayTitle ?? item.title, item.originalTitle),
          item.seasonNumber,
          item.episodeNumber,
          item.episodeTitle,
        ),
        provider: item.provider,
        progress: Math.max(0, Math.min(100, Math.round(Number(item.progress) || 0))),
        updatedAt: item.updatedAt ?? "",
        active: isActiveSession(item, now),
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
    const seasonNumber = Number.isInteger(item.seasonNumber) && Number.isInteger(item.episodeNumber)
      ? item.seasonNumber
      : null;
    const episodeNumber = seasonNumber != null ? item.episodeNumber : null;
    const rawProgress = Number(item.progress ?? item.coverage);
    return {
      eventId: item.eventId,
      provider: item.provider,
      title: item.title,
      canonicalTitle: item.displayTitle ?? null,
      originalTitle: item.originalTitle ?? null,
      seasonNumber,
      episodeNumber,
      episodeTitle: episodeNumber != null ? item.episodeTitle ?? null : null,
      url: item.url ?? null,
      duration: Number.isInteger(item.duration) && item.duration > 0 && item.duration <= 24 * 60 * 60
        ? item.duration
        : null,
      progress: Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 80,
      watchedAt: item.watchedAt ?? item.updatedAt ?? new Date().toISOString(),
    };
  }

  function toProgressPayload(item) {
    if (!isValidPlaybackPosition(item.duration, item.currentTime)) return null;
    return {
      eventId: item.eventId,
      provider: item.provider,
      title: item.title,
      canonicalTitle: item.displayTitle ?? null,
      originalTitle: item.originalTitle ?? null,
      seasonNumber: item.seasonNumber ?? null,
      episodeNumber: item.episodeNumber ?? null,
      episodeTitle: item.episodeTitle ?? null,
      url: item.url ?? null,
      duration: item.duration,
      currentTime: item.currentTime,
      progress: item.progress,
      observedAt: item.updatedAt,
    };
  }

  function isValidPlaybackPosition(duration, currentTime) {
    return Number.isInteger(duration)
      && duration > 0
      && duration <= 24 * 60 * 60
      && Number.isInteger(currentTime)
      && currentTime >= 0
      && currentTime <= duration + 30;
  }

  function sessionIdentity(provider, title, value, seasonNumber, episodeNumber) {
    const episode = Number.isInteger(seasonNumber) && Number.isInteger(episodeNumber)
      ? `:s${seasonNumber}e${episodeNumber}`
      : "";
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
          if (contentId) return `${provider}:https://${hosts[0]}/detail/${contentId}${episode}`;
        }
        return `${provider}:https://${hosts[0]}${url.pathname.replace(/\/$/, "")}${episode}`;
      }
    } catch {}
    return `${provider}:${String(title).toLocaleLowerCase().replace(/\s+/g, " ").trim()}${episode}`;
  }

  function normalizeSessionKeys(records) {
    let normalized = records ?? {};
    for (const [key, item] of Object.entries(records ?? {})) {
      const expected = sessionIdentity(item.provider, item.title, item.url, item.seasonNumber, item.episodeNumber);
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

  const api = { apiBase, normalizePairCode, prepareWatchedItem, isUsefulTitle, formatTitle, formatEpisodeTitle, isActiveSession, listInProgress, shouldRestartDismissed, isTrackablePlayback, toSyncPayload, toProgressPayload, isValidPlaybackPosition, sessionIdentity, normalizeSessionKeys };
  root.ReelSync = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
