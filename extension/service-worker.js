importScripts("coverage.js", "sync.js", "auth.js");

const SESSIONS_KEY = "reelmark.sessions";
const WATCHED_KEY = "reelmark.watched";
const CONNECTION_KEY = "reelmark.connection";
const INSTALL_ID_KEY = "reelmark.installId";
const AUTH_STATE_KEY = "reelmark.authState";

function identity(provider, title) {
  return `${provider}:${title.toLocaleLowerCase().replace(/\s+/g, " ").trim()}`;
}

async function request(path, body, token) {
  const response = await fetch(`${ReelSync.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Reelmark tidak dapat dihubungi.");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function syncPending(watched, connection) {
  if (!connection?.token) return watched;

  let changed = false;
  const next = { ...watched };
  for (const [key, original] of Object.entries(next)) {
    if (original.syncedAt) continue;
    const item = ReelSync.prepareWatchedItem(original, crypto.randomUUID());
    if (item !== original) changed = true;

    try {
      const result = await request("/api/extension/sync", ReelSync.toSyncPayload(item), connection.token);
      next[key] = {
        ...item,
        syncedAt: new Date().toISOString(),
        catalogMatched: result.matched,
      };
      changed = true;
    } catch (error) {
      next[key] = item;
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

async function claimExtension(method, code, deviceName) {
  const stored = await chrome.storage.local.get([INSTALL_ID_KEY, WATCHED_KEY]);
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
  await syncPending(stored[WATCHED_KEY] ?? {}, connection);
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SUMMARY") {
    chrome.storage.local.get([WATCHED_KEY, SESSIONS_KEY, CONNECTION_KEY]).then(async (data) => {
      const connection = data[CONNECTION_KEY] ?? null;
      const synced = await syncPending(data[WATCHED_KEY] ?? {}, connection);
      const watched = Object.values(synced)
        .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
      const inProgress = ReelSync.listInProgress(data[SESSIONS_KEY]);
      sendResponse({
        watched,
        inProgress,
        activeCount: inProgress.length,
        connected: Boolean(connection?.token),
        pairedAt: connection?.pairedAt ?? null,
      });
    });
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
  chrome.storage.local.get([WATCHED_KEY, SESSIONS_KEY, CONNECTION_KEY]).then(async (data) => {
    const key = identity(heartbeat.provider, heartbeat.title);
    const watched = data[WATCHED_KEY] ?? {};
    const sessions = data[SESSIONS_KEY] ?? {};
    const previous = sessions[key] ?? { buckets: [] };
    const buckets = [...new Set([...previous.buckets, ...heartbeat.buckets])];
    const coverage = ReelCoverage.coveragePercent(buckets, heartbeat.duration);
    const previouslyWatched = Boolean(watched[key]);
    const justCompleted = coverage >= 80 && !previouslyWatched;

    sessions[key] = {
      ...heartbeat,
      buckets,
      coverage,
      updatedAt: heartbeat.observedAt,
    };

    if (justCompleted) {
      watched[key] = {
        eventId: crypto.randomUUID(),
        provider: heartbeat.provider,
        title: heartbeat.title,
        url: heartbeat.url,
        duration: heartbeat.duration,
        coverage,
        watchedAt: heartbeat.observedAt,
      };
      delete sessions[key];
    }

    await chrome.storage.local.set({ [WATCHED_KEY]: watched, [SESSIONS_KEY]: sessions });
    if (justCompleted) await syncPending(watched, data[CONNECTION_KEY]);
    sendResponse({ coverage, previouslyWatched, justCompleted });
  });

  return true;
});
