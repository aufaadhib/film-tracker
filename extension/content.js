const PROVIDERS = {
  "www.netflix.com": "netflix",
  "disneyplus.com": "disney",
  "www.disneyplus.com": "disney",
  "www.primevideo.com": "prime_video",
  "play.max.com": "max",
};

const PROVIDER_LABELS = {
  netflix: "Netflix",
  disney: "Disney+",
  prime_video: "Prime Video",
  max: "Max",
};

const TITLE_SELECTORS = {
  netflix: ['[data-uia="video-title"] h4', '[data-uia="video-title"]'],
  disney: ['video[aria-label]', '[data-testid="player-title"]', '[class*="title" i] h1', 'h1', 'h2'],
  prime_video: ['[data-testid="detail-title"]', '.atvwebplayersdk-title-text'],
  max: ['[data-testid="player-title"]', '[class*="Title"] h1'],
};

const provider = PROVIDERS[location.hostname];
let activeVideo = null;
let activeTitle = "";
let lastHeartbeat = 0;
let warningShownFor = "";
let extensionAvailable = true;
let scanInterval;

function cleanTitle(value) {
  const providerName = PROVIDER_LABELS[provider] ?? "";
  const escapedProvider = providerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)[0]
    ?.replace(new RegExp(`\\s*[-|–—]\\s*${escapedProvider}.*$`, "i"), "")
    .trim() ?? "";
}

function getSearchRoots() {
  const roots = [document];
  if (provider !== "disney") return roots;

  for (const root of roots) {
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) roots.push(element.shadowRoot);
    }
  }
  return roots;
}

function detectTitle(roots) {
  const mediaTitle = cleanTitle(globalThis.navigator?.mediaSession?.metadata?.title ?? "");
  if (ReelSync.isUsefulTitle(mediaTitle, provider)) return mediaTitle;

  for (const selector of TITLE_SELECTORS[provider] ?? []) {
    for (const root of roots) {
      const element = root.querySelector(selector);
      const value = element?.getAttribute?.("aria-label") ?? element?.textContent;
      const title = cleanTitle(value ?? "");
      if (ReelSync.isUsefulTitle(title, provider)) return title;
    }
  }
  const fallback = cleanTitle(document.title);
  return ReelSync.isUsefulTitle(fallback, provider) ? fallback : "";
}

function playbackMetrics(video) {
  const currentTime = Number(video?.currentTime);
  if (!Number.isFinite(currentTime)) return null;

  const duration = Number(video?.duration);
  if (Number.isFinite(duration) && duration > 0) {
    return { duration, currentTime: Math.max(0, Math.min(duration, currentTime)) };
  }

  const seekable = video?.seekable;
  if (!seekable?.length) return null;
  const rangeIndex = seekable.length - 1;
  const seekableStart = Number(seekable.start(rangeIndex));
  const seekableEnd = Number(seekable.end(rangeIndex));
  const seekableDuration = seekableEnd - seekableStart;
  if (!Number.isFinite(seekableDuration) || seekableDuration <= 0) return null;

  return {
    duration: seekableDuration,
    currentTime: Math.max(0, Math.min(seekableDuration, currentTime - seekableStart)),
  };
}

function showNotice(title, message) {
  document.getElementById("reelmark-notice")?.remove();

  const notice = document.createElement("aside");
  notice.id = "reelmark-notice";
  notice.setAttribute("role", "status");
  Object.assign(notice.style, {
    position: "fixed",
    zIndex: "2147483647",
    right: "20px",
    top: "20px",
    width: "min(340px, calc(100vw - 40px))",
    padding: "16px",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: "12px",
    color: "#fff",
    background: "#293241",
    boxShadow: "0 16px 42px rgba(0,0,0,.34)",
    fontFamily: "Arial, sans-serif",
  });

  const label = document.createElement("div");
  label.textContent = "REELMARK · LOG TONTONAN";
  Object.assign(label.style, { color: "#ef7958", fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px" });
  const heading = document.createElement("strong");
  heading.textContent = title;
  Object.assign(heading.style, { display: "block", margin: "8px 28px 4px 0", fontSize: "16px" });
  const copy = document.createElement("p");
  copy.textContent = message;
  Object.assign(copy.style, { margin: "0", color: "#cbd3da", fontSize: "13px", lineHeight: "1.45" });
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Tutup notifikasi Reelmark");
  Object.assign(close.style, { position: "absolute", right: "11px", top: "8px", border: "0", color: "#fff", background: "transparent", cursor: "pointer", fontSize: "22px" });
  close.addEventListener("click", () => notice.remove());
  notice.append(label, heading, copy, close);
  document.documentElement.append(notice);
  window.setTimeout(() => notice.remove(), 9000);
}

async function sendHeartbeat(force = false) {
  const playback = playbackMetrics(activeVideo);
  if (!activeVideo || !activeTitle || !playback) return;
  const now = Date.now();
  if (!force && now - lastHeartbeat < 15000) return;
  lastHeartbeat = now;

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "HEARTBEAT",
      payload: {
        provider,
        title: activeTitle,
        url: location.href,
        duration: Math.round(playback.duration),
        currentTime: Math.round(playback.currentTime),
        playing: !activeVideo.paused,
        observedAt: new Date().toISOString(),
      },
    });
  } catch {
    extensionAvailable = false;
    window.clearInterval(scanInterval);
    return;
  }

  if (!response) return;
  if (response.previouslyWatched && warningShownFor !== activeTitle) {
    warningShownFor = activeTitle;
    showNotice(response.title ?? activeTitle, "Judul ini sudah pernah kamu tonton.");
  } else if (response.justCompleted) {
    warningShownFor = activeTitle;
    showNotice(response.title ?? activeTitle, "Posisi video mencapai 80%. Ditandai sebagai sudah ditonton.");
  }
}

function onTimeUpdate() {
  if (!activeVideo || activeVideo.paused || activeVideo.seeking) return;
  void sendHeartbeat();
}

function onPause() {
  void sendHeartbeat(true);
}

function attachVideo(video) {
  if (video === activeVideo) return;
  activeVideo?.removeEventListener("timeupdate", onTimeUpdate);
  activeVideo?.removeEventListener("pause", onPause);
  activeVideo = video;
  lastHeartbeat = 0;
  video.addEventListener("timeupdate", onTimeUpdate, { passive: true });
  video.addEventListener("pause", onPause, { passive: true });
}

function detachVideo() {
  activeVideo?.removeEventListener("timeupdate", onTimeUpdate);
  activeVideo?.removeEventListener("pause", onPause);
  activeVideo = null;
  activeTitle = "";
  lastHeartbeat = 0;
}

function scan() {
  if (!extensionAvailable) return;
  if (!ReelSync.isTrackablePlayback(provider, location.href)) {
    detachVideo();
    return;
  }
  const roots = getSearchRoots();
  const title = detectTitle(roots);
  if (title && title !== activeTitle) {
    activeTitle = title;
    lastHeartbeat = 0;
    warningShownFor = "";
  }

  const video = roots.flatMap((root) => [...root.querySelectorAll("video")])
    .sort((a, b) => {
      const labeled = Number(Boolean(b.getAttribute?.("aria-label"))) - Number(Boolean(a.getAttribute?.("aria-label")));
      return labeled || b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight;
    })[0];
  if (video) attachVideo(video);
  if (video && title) void sendHeartbeat();
}

scanInterval = window.setInterval(scan, 3000);
scan();
