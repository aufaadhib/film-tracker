const PROVIDERS = {
  "www.netflix.com": "netflix",
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
  netflix: ['[data-uia="video-title"]', '[data-uia="video-title"] h4'],
  disney: ['[data-testid="player-title"]', '[class*="title"] h1'],
  prime_video: ['[data-testid="detail-title"]', '.atvwebplayersdk-title-text'],
  max: ['[data-testid="player-title"]', '[class*="Title"] h1'],
};

const provider = PROVIDERS[location.hostname];
let activeVideo = null;
let activeTitle = "";
let watchedBuckets = new Set();
let lastHeartbeat = 0;
let warningShownFor = "";

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

function detectTitle() {
  for (const selector of TITLE_SELECTORS[provider] ?? []) {
    const value = document.querySelector(selector)?.textContent;
    const title = cleanTitle(value ?? "");
    if (ReelSync.isUsefulTitle(title, provider)) return title;
  }
  const fallback = cleanTitle(document.title);
  return ReelSync.isUsefulTitle(fallback, provider) ? fallback : "";
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
  if (!activeVideo || !activeTitle || !Number.isFinite(activeVideo.duration)) return;
  const now = Date.now();
  if (!force && now - lastHeartbeat < 15000) return;
  lastHeartbeat = now;

  const response = await chrome.runtime.sendMessage({
    type: "HEARTBEAT",
    payload: {
      provider,
      title: activeTitle,
      url: location.href,
      duration: Math.round(activeVideo.duration),
      currentTime: Math.round(activeVideo.currentTime),
      buckets: [...watchedBuckets],
      observedAt: new Date().toISOString(),
    },
  }).catch(() => null);

  if (!response) return;
  if (response.previouslyWatched && warningShownFor !== activeTitle) {
    warningShownFor = activeTitle;
    showNotice(activeTitle, "Judul ini sudah pernah kamu tonton.");
  } else if (response.justCompleted) {
    warningShownFor = activeTitle;
    showNotice(activeTitle, "80% bagian unik sudah terputar. Ditandai sebagai sudah ditonton.");
  }
}

function onTimeUpdate() {
  if (!activeVideo || activeVideo.paused || activeVideo.seeking) return;
  watchedBuckets.add(ReelCoverage.bucketFor(activeVideo.currentTime));
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
  watchedBuckets = new Set();
  lastHeartbeat = 0;
  video.addEventListener("timeupdate", onTimeUpdate, { passive: true });
  video.addEventListener("pause", onPause, { passive: true });
}

function scan() {
  const title = detectTitle();
  if (title && title !== activeTitle) {
    activeTitle = title;
    watchedBuckets = new Set();
    lastHeartbeat = 0;
    warningShownFor = "";
  }

  const video = [...document.querySelectorAll("video")]
    .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
  if (video) attachVideo(video);
  if (video && title) void sendHeartbeat();
}

scan();
window.setInterval(scan, 3000);
