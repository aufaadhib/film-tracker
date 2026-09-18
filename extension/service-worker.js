importScripts("coverage.js", "sync.js", "auth.js");

const SESSIONS_KEY = "reelmark.sessions";
const WATCHED_KEY = "reelmark.watched";
const CONNECTION_KEY = "reelmark.connection";
const INSTALL_ID_KEY = "reelmark.installId";
const AUTH_STATE_KEY = "reelmark.authState";

async function request(path, body, token) {
  const response = await fetch(`${ReelSync.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Reelmark tidak dapat dihubungi.");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function syncPending(watched, connection, force = false) {
  const normalized = ReelSync.normalizeSessionKeys(watched);
  if (!connection?.token) {
    if (normalized !== watched) await chrome.storage.local.set({ [WATCHED_KEY]: normalized });
    return normalized;
  }

  let changed = normalized !== watched;
  const next = { ...normalized };
  for (const [key, original] of Object.entries(next)) {
    if (original.syncedAt) continue;
    if (!force && original.syncAttemptedAt
      && Date.now() - Date.parse(original.syncAttemptedAt) < 60_000) continue;
    const item = ReelSync.prepareWatchedItem(original, crypto.randomUUID());
    if (item !== original) changed = true;

    try {
      const result = await request("/api/extension/sync", ReelSync.toSyncPayload(item), connection.token);
      next[key] = {
        ...item,
        displayTitle: result.title ?? item.displayTitle,
        originalTitle: result.originalTitle ?? item.originalTitle,
        syncedAt: new Date().toISOString(),
        syncError: null,
        catalogMatched: result.matched,
      };
      changed = true;
    } catch (error) {
      next[key] = {
        ...item,
        syncError: error.message || "Sinkronisasi gagal.",
        syncAttemptedAt: new Date().toISOString(),
      };
      changed = true;
      if (error.status === 401) {
        await chrome.storage.local.remove(CONNECTION_KEY);
        connection.token = null;
        break;
      }
    }
  }

  if (changed) await chrome.storage.local.set({ [WATCHED_KEY]: next });
  return next;
}

async function syncProgressSessions(sessions, connection) {
  const normalized = ReelSync.normalizeSessionKeys(sessions);
  if (!connection?.token) {
    if (normalized !== sessions) await chrome.storage.local.set({ [SESSIONS_KEY]: normalized });
    return normalized;
  }

  let changed = normalized !== sessions;
  const next = { ...normalized };
  for (const [key, original] of Object.entries(next)) {
    if (original.dismissed) continue;
    if (!ReelSync.isUsefulTitle(original.title, original.provider)
      || !ReelSync.isTrackablePlayback(original.provider, original.url)) {
      delete next[key];
      changed = true;
      continue;
    }
    const item = original.eventId ? original : { ...original, eventId: crypto.randomUUID() };
    if (item !== original) {
      next[key] = item;
      changed = true;
    }

    try {
      const payload = ReelSync.toProgressPayload(item);
      if (!payload) continue;
      const result = await request("/api/extension/progress", payload, connection.token);
      if (result.dismissed || (result.title && result.title !== item.displayTitle) || (result.originalTitle && result.originalTitle !== item.originalTitle)) {
        next[key] = {
          ...item,
          displayTitle: result.title ?? item.displayTitle,
          originalTitle: result.originalTitle ?? item.originalTitle,
          dismissed: Boolean(result.dismissed),
        };
        changed = true;
      }
    } catch (error) {
      if (error.status === 401) {
        await chrome.storage.local.remove(CONNECTION_KEY);
        connection.token = null;
        break;
      }
    }
  }

  if (changed) await chrome.storage.local.set({ [SESSIONS_KEY]: next });
  return next;
}

async function claimExtension(method, code, deviceName) {
  const stored = await chrome.storage.local.get([INSTALL_ID_KEY, WATCHED_KEY, SESSIONS_KEY]);
  const installId = stored[INSTALL_ID_KEY] ?? crypto.randomUUID();
  const result = await request("/api/extension/pair", {
    method,
    code: method === "manual" ? ReelSync.normalizePairCode(code) : code,
    installId,
    deviceName: String(deviceName || "Chrome / Edge").slice(0, 80),
  });
  const connection = {
    token: result.token,
    deviceId: result.deviceId,
    pairedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId, [CONNECTION_KEY]: connection });
  await syncPending(stored[WATCHED_KEY] ?? {}, connection, true);
  await syncProgressSessions(stored[SESSIONS_KEY] ?? {}, connection);
  return connection;
}

async function loginExtension(deviceName) {
  const stored = await chrome.storage.local.get(INSTALL_ID_KEY);
  const installId = stored[INSTALL_ID_KEY] ?? crypto.randomUUID();
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });

  const state = ReelAuth.randomState();
  const redirectUri = chrome.identity.getRedirectURL("reelmark");
  await chrome.storage.session.set({
    [AUTH_STATE_KEY]: { state, createdAt: Date.now() },
  });

  const authUrl = ReelAuth.buildAuthUrl(ReelSync.apiBase, {
    redirectUri,
    state,
    installId,
    deviceName: String(deviceName || "Chrome / Edge").slice(0, 80),
  });

  let callbackUrl;
  try {
    callbackUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (result) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError || !result) {
          reject(new Error(runtimeError?.message || "Login dibatalkan atau jendela login ditutup."));
          return;
        }
        resolve(result);
      });
    });

    const pending = (await chrome.storage.session.get(AUTH_STATE_KEY))[AUTH_STATE_KEY];
    if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
      throw new Error("Sesi login kedaluwarsa. Silakan coba lagi.");
    }
    let code;
    try {
      code = ReelAuth.parseAuthCallback(callbackUrl, pending.state);
    } catch (error) {
      if (error.message.includes("belum diizinkan")) {
        error.message += ` Tambahkan REELMARK_EXTENSION_IDS=${chrome.runtime.id}, lalu restart server.`;
      }
      throw error;
    }
    return await claimExtension("web", code, deviceName);
  } finally {
    await chrome.storage.session.remove(AUTH_STATE_KEY);
  }
}

async function disconnectExtension() {
  const stored = await chrome.storage.local.get(CONNECTION_KEY);
  const connection = stored[CONNECTION_KEY];
  if (!connection?.token) return;

  try {
    await request("/api/extension/disconnect", {}, connection.token);
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  await chrome.storage.local.remove(CONNECTION_KEY);
}

function buildSummary(watchedRecords, sessionRecords, connection) {
  const watchedMap = ReelSync.normalizeSessionKeys(watchedRecords ?? {});
  const sessions = ReelSync.normalizeSessionKeys(sessionRecords ?? {});
  const watched = Object.values(watchedMap)
    .filter((item) => ReelSync.isUsefulTitle(item.title, item.provider))
    .map((item) => ({ ...item, title: ReelSync.formatEpisodeTitle(ReelSync.formatTitle(item.displayTitle ?? item.title, item.originalTitle), item.seasonNumber, item.episodeNumber, item.episodeTitle) }))
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
  const inProgress = ReelSync.listInProgress(sessions);
  const activeKeys = new Set(Object.entries(sessions)
    .filter(([, item]) => item && !item.dismissed && ReelSync.isUsefulTitle(item.title, item.provider))
    .map(([key]) => key));
  const recent = Object.entries(watchedMap)
    .filter(([key, item]) => !activeKeys.has(key) && ReelSync.isUsefulTitle(item.title, item.provider))
    .map(([, item]) => ({ ...item, title: ReelSync.formatEpisodeTitle(ReelSync.formatTitle(item.displayTitle ?? item.title, item.originalTitle), item.seasonNumber, item.episodeNumber, item.episodeTitle) }))
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));

  return {
    watched,
    recent,
    inProgress,
    activeCount: inProgress.length,
    connected: Boolean(connection?.token),
    pairedAt: connection?.pairedAt ?? null,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SUMMARY") {
    chrome.storage.local.get([WATCHED_KEY, SESSIONS_KEY, CONNECTION_KEY])
      .then((data) => sendResponse(buildSummary(
        data[WATCHED_KEY] ?? {},
        data[SESSIONS_KEY] ?? {},
        data[CONNECTION_KEY] ?? null,
      )))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "REFRESH_SUMMARY") {
    chrome.storage.local.get([WATCHED_KEY, SESSIONS_KEY, CONNECTION_KEY]).then(async (data) => {
      const connection = data[CONNECTION_KEY] ?? null;
      const watched = await syncPending(data[WATCHED_KEY] ?? {}, connection, true);
      const sessions = await syncProgressSessions(data[SESSIONS_KEY] ?? {}, connection);
      sendResponse(buildSummary(watched, sessions, connection));
    }).catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "PAIR") {
    claimExtension("manual", message.payload?.code, message.payload?.deviceName)
      .then((connection) => sendResponse({ ok: true, pairedAt: connection.pairedAt }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "LOGIN") {
    loginExtension(message.payload?.deviceName)
      .then((connection) => sendResponse({ ok: true, pairedAt: connection.pairedAt }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "DISCONNECT") {
    disconnectExtension()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type !== "HEARTBEAT") return false;

  const heartbeat = message.payload;
  if (!ReelSync.isValidPlaybackPosition(heartbeat.duration, heartbeat.currentTime)) {
    sendResponse({ ignored: true });
    return false;
  }
  chrome.storage.local.get([WATCHED_KEY, SESSIONS_KEY, CONNECTION_KEY]).then(async (data) => {
    const key = ReelSync.sessionIdentity(heartbeat.provider, heartbeat.title, heartbeat.url, heartbeat.seasonNumber, heartbeat.episodeNumber);
    let watched = ReelSync.normalizeSessionKeys(data[WATCHED_KEY] ?? {});
    const sessions = ReelSync.normalizeSessionKeys(data[SESSIONS_KEY] ?? {});
    watched = await syncPending(watched, data[CONNECTION_KEY]);
    let correctedPrevious = null;
    if (heartbeat.seasonNumber != null && heartbeat.episodeNumber != null) {
      for (const [legacyKey, item] of Object.entries(sessions)) {
        if (legacyKey !== key
          && item.provider === heartbeat.provider
          && item.title === heartbeat.title
          && item.url === heartbeat.url
          && item.episodeNumber === heartbeat.episodeNumber) {
          correctedPrevious ??= item;
          delete sessions[legacyKey];
        }
      }
      for (const [legacyKey, item] of [...Object.entries(watched), ...Object.entries(sessions)]) {
        if (legacyKey !== key
          && item.provider === heartbeat.provider
          && item.title === heartbeat.title
          && item.episodeNumber == null) {
          delete watched[legacyKey];
          delete sessions[legacyKey];
        }
      }
    }
    const storedPrevious = sessions[key] ?? correctedPrevious ?? {};
    const restartDismissed = ReelSync.shouldRestartDismissed(storedPrevious, heartbeat.playing);
    const previous = restartDismissed ? {
      displayTitle: storedPrevious.displayTitle,
      originalTitle: storedPrevious.originalTitle,
    } : storedPrevious;
    const watchedItem = watched[key];
    const eventId = previous.eventId ?? crypto.randomUUID();
    const progress = ReelCoverage.playbackPercent(heartbeat.currentTime, heartbeat.duration);
    const previouslyWatched = Boolean(watchedItem);
    const justCompleted = ReelCoverage.shouldRecordCompletion(progress, Number(previous.progress), previouslyWatched);

    if (previous.dismissed) {
      sendResponse({ progress, title: ReelSync.formatEpisodeTitle(ReelSync.formatTitle(previous.displayTitle ?? heartbeat.title, previous.originalTitle), heartbeat.seasonNumber, heartbeat.episodeNumber, heartbeat.episodeTitle), dismissed: true, previouslyWatched: false, justCompleted: false });
      return;
    }

    const completedPlayback = previouslyWatched
      && ReelCoverage.isWatchedPosition(progress)
      && !justCompleted;
    if (completedPlayback) {
      delete sessions[key];
      await chrome.storage.local.set({ [WATCHED_KEY]: watched, [SESSIONS_KEY]: sessions });
      await syncPending(watched, data[CONNECTION_KEY]);
      sendResponse({
        progress,
        title: ReelSync.formatEpisodeTitle(
          ReelSync.formatTitle(watchedItem.displayTitle ?? heartbeat.title, watchedItem.originalTitle),
          heartbeat.seasonNumber,
          heartbeat.episodeNumber,
          heartbeat.episodeTitle,
        ),
        previouslyWatched: true,
        justCompleted: false,
      });
      return;
    }

    sessions[key] = {
      ...heartbeat,
      eventId,
      displayTitle: previous.displayTitle ?? watchedItem?.displayTitle,
      originalTitle: previous.originalTitle ?? watchedItem?.originalTitle,
      progress,
      updatedAt: heartbeat.observedAt,
    };

    if (justCompleted) {
      watched[key] = {
        eventId,
        provider: heartbeat.provider,
        title: heartbeat.title,
        displayTitle: previous.displayTitle ?? watchedItem?.displayTitle,
        originalTitle: previous.originalTitle ?? watchedItem?.originalTitle,
        seasonNumber: heartbeat.seasonNumber ?? null,
        episodeNumber: heartbeat.episodeNumber ?? null,
        episodeTitle: heartbeat.episodeTitle ?? null,
        url: heartbeat.url,
        duration: heartbeat.duration,
        progress,
        watchedAt: heartbeat.observedAt,
      };
      delete sessions[key];
    }

    await chrome.storage.local.set({ [WATCHED_KEY]: watched, [SESSIONS_KEY]: sessions });
    let displayTitle = previous.displayTitle ?? watchedItem?.displayTitle ?? heartbeat.title;
    let originalTitle = previous.originalTitle ?? watchedItem?.originalTitle;
    if (justCompleted) {
      const synced = await syncPending(watched, data[CONNECTION_KEY], true);
      const syncedItem = synced[key];
      displayTitle = syncedItem?.displayTitle ?? displayTitle;
      originalTitle = syncedItem?.originalTitle ?? originalTitle;
      sendResponse({
        progress,
        title: ReelSync.formatEpisodeTitle(ReelSync.formatTitle(displayTitle, originalTitle), heartbeat.seasonNumber, heartbeat.episodeNumber, heartbeat.episodeTitle),
        previouslyWatched,
        justCompleted,
        synced: Boolean(syncedItem?.syncedAt),
      });
      return;
    } else if (data[CONNECTION_KEY]?.token) {
      try {
        const result = await request("/api/extension/progress", ReelSync.toProgressPayload(sessions[key]), data[CONNECTION_KEY].token);
        if (result.title) {
          sessions[key].displayTitle = result.title;
          displayTitle = result.title;
        }
        if (result.originalTitle) {
          sessions[key].originalTitle = result.originalTitle;
          originalTitle = result.originalTitle;
        }
        if (result.dismissed) sessions[key].dismissed = true;
        if (result.title || result.originalTitle || result.dismissed) await chrome.storage.local.set({ [SESSIONS_KEY]: sessions });
      } catch (error) {
        if (error.status === 401) await chrome.storage.local.remove(CONNECTION_KEY);
      }
    }
    sendResponse({ progress, title: ReelSync.formatEpisodeTitle(ReelSync.formatTitle(displayTitle, originalTitle), heartbeat.seasonNumber, heartbeat.episodeNumber, heartbeat.episodeTitle), previouslyWatched, justCompleted });
  });

  return true;
});
