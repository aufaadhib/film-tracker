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
  prime_video: ['.atvwebplayersdk-title-text'],
  max: ['[data-testid="player-title"]', '[class*="Title"] h1'],
};

const provider = PROVIDERS[location.hostname];
let activeVideo = null;
let activeTitle = "";
let activePlaybackUrl = "";
let activeEpisode = null;
let activeSeasonNumber = null;
let lastHeartbeat = 0;
let warningShownFor = "";
let extensionAvailable = true;
let scanInterval;
let activeRoots = [document];

function cleanTitle(value) {
  const providerName = PROVIDER_LABELS[provider] ?? "";
  const escapedProvider = providerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)[0]
    ?.replace(new RegExp(`^${escapedProvider}\\s*[:|–—-]\\s*`, "i"), "")
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
  for (const selector of TITLE_SELECTORS[provider] ?? []) {
    for (const root of roots) {
      const element = root.querySelector(selector);
      const value = element?.getAttribute?.("aria-label") ?? element?.textContent;
      const title = cleanTitle(value ?? "");
      if (ReelSync.isUsefulTitle(title, provider)) return title;
    }
  }
  const mediaTitle = cleanTitle(globalThis.navigator?.mediaSession?.metadata?.title ?? "");
  if (ReelSync.isUsefulTitle(mediaTitle, provider)
    && !(provider === "prime_video" && parseSeason(mediaTitle) != null)) return mediaTitle;
  const fallback = cleanTitle(document.title);
  if (provider === "prime_video" && parseSeason(fallback) != null) return "";
  return ReelSync.isUsefulTitle(fallback, provider) ? fallback : "";
}

function parseEpisode(value) {
  const text = String(value ?? "")
    .replace(/([a-zÀ-ÿ])(?=E\d)/g, "$1 ")
    .replace(/(\d)(?=Episode\b)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  const match = text.match(/(?:\bS(?:eason)?\s*(\d{1,3})\s*[:.\- ]*\s*E(?:pisode)?\s*(\d{1,4})\b|\b(?:Season|Musim)\s*(\d{1,3})\s*(?:Episode|Ep)\s*(\d{1,4})\b|\bE(?:pisode)?\s*(\d{1,4})\b)/i);
  if (!match) return null;
  const seasonNumber = match[1] != null || match[3] != null
    ? Number(match[1] ?? match[3])
    : null;
  const episodeNumber = Number(match[2] ?? match[4] ?? match[5]);
  if ((seasonNumber != null && !Number.isInteger(seasonNumber))
    || !Number.isInteger(episodeNumber)
    || episodeNumber < 1) return null;
  const episodeTitle = text.slice((match.index ?? 0) + match[0].length).replace(/^[\s:.,_\-–—]+/, "").trim();
  return { seasonNumber, episodeNumber, episodeTitle: episodeTitle || null };
}

function parseSeason(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const match = text.match(/(?:season|musim|saison|temporada|staffel|seizoen|stagione|sezon|сезон|시즌|シーズン)\s*(\d{1,3})/i)
    ?? text.match(/第\s*(\d{1,3})\s*季/);
  const seasonNumber = Number(match?.[1]);
  return Number.isInteger(seasonNumber) && seasonNumber >= 0 ? seasonNumber : null;
}

function detectSeason(roots) {
  const selector = '[data-uia*="season" i], [data-testid*="season" i], [aria-label*="season" i], [class*="season" i], h1, h2, h3, button, div, span';
  for (const root of roots) {
    for (const element of root.querySelectorAll(selector)) {
      const label = element.getAttribute?.("aria-label") || element.textContent;
      if (String(label ?? "").trim().length > 40) continue;
      const season = parseSeason(label);
      if (season == null) continue;
      const visible = !element.hidden
        && element.getAttribute?.("aria-hidden") !== "true"
        && (typeof element.getClientRects !== "function" || element.getClientRects().length > 0);
      if (visible) return season;
    }
  }
  return null;
}

function detectEpisode(roots, fallbackSeason) {
  const complete = (episode) => episode && ({
    ...episode,
    seasonNumber: episode.seasonNumber ?? fallbackSeason ?? 1,
  });

  if (provider === "disney") {
    for (const root of roots) {
      for (const element of root.querySelectorAll('[data-qa="title-bug.subtitle"]')) {
        const episode = parseEpisode(element.textContent);
        if (episode) return complete(episode);
      }
    }
  }

  if (provider === "prime_video") {
    for (const root of roots) {
      for (const element of root.querySelectorAll('.atvwebplayersdk-episode-info')) {
        const episode = parseEpisode(element.textContent);
        if (episode) return complete(episode);
      }
    }
  }

  for (const selector of TITLE_SELECTORS[provider] ?? []) {
    for (const root of roots) {
      for (const element of root.querySelectorAll(selector)) {
        for (let current = element, depth = 0; current && depth < 3; current = current.parentElement, depth += 1) {
          if (/next|upnext|pivot|recommend/.test(elementHint(current))) continue;
          if (current.hidden || current.getAttribute?.("aria-hidden") === "true") continue;
          if (typeof current.getClientRects === "function" && current.getClientRects().length === 0) continue;
          const episode = parseEpisode(current.innerText || current.textContent || current.getAttribute?.("aria-label"));
          if (episode) return complete(episode);
        }
      }
    }
  }

  const selector = '[data-uia="video-title"], [data-uia*="episode" i], [data-qa*="episode" i], [data-testid*="episode" i], [class*="episode" i]';
  for (const root of roots) {
    for (const element of root.querySelectorAll(selector)) {
      if (/next|upnext|pivot|recommend/.test(elementHint(element))) continue;
      const episode = parseEpisode(element.innerText || element.textContent || element.getAttribute?.("aria-label"));
      if (episode) return complete(episode);
    }
  }

  const media = globalThis.navigator?.mediaSession?.metadata;
  for (const value of [media?.title, media?.artist, media?.album, `${media?.artist ?? ""} ${media?.title ?? ""}`]) {
    const episode = parseEpisode(value);
    if (episode) return complete(episode);
  }
  return null;
}

function readNetflixMetadata() {
  if (provider !== "netflix") return null;
  try {
    const metadata = JSON.parse(document.documentElement.dataset.reelmarkNetflixMetadata ?? "null");
    const requestedVideoId = Number(location.pathname.match(/^\/watch\/(\d+)/)?.[1]);
    if (!metadata || metadata.videoId !== requestedVideoId) return null;
    return metadata;
  } catch {
    return null;
  }
}

function parseClockTime(value) {
  const match = String(value ?? "").trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function elementHint(element) {
  const values = [];
  for (let current = element, depth = 0; current && depth < 3; current = current.parentElement, depth += 1) {
    values.push(
      current.id,
      typeof current.className === "string" ? current.className : "",
      current.getAttribute?.("aria-label"),
      current.getAttribute?.("data-testid"),
      current.getAttribute?.("data-qa"),
    );
  }
  return values.filter(Boolean).join(" ").toLowerCase();
}

function detectPlayerTimeline(roots) {
  const currentCandidates = [];
  const durationCandidates = [];
  const clockCandidates = [];

  for (const root of roots) {
    const primeCurrent = root.querySelector?.("#atvwebplayersdk-time-indicator");
    const primeRemaining = root.querySelector?.("#atvwebplayersdk-time-remaining-indicator");
    if (primeCurrent && primeRemaining) {
      const currentTime = parseClockTime(primeCurrent.textContent);
      const remaining = parseClockTime(primeRemaining.textContent);
      if (remaining > 0 && currentTime + remaining <= 24 * 60 * 60) {
        return { currentTime, duration: currentTime + remaining };
      }
    }

    for (const element of root.querySelectorAll('[role="slider"], input[type="range"]')) {
      const duration = Number(element.getAttribute?.("aria-valuemax") ?? element.getAttribute?.("max"));
      const currentTime = Number(element.getAttribute?.("aria-valuenow") ?? element.value ?? element.getAttribute?.("value"));
      if (Number.isFinite(duration) && duration > 5 * 60
        && duration <= 24 * 60 * 60
        && Number.isFinite(currentTime) && currentTime >= 0 && currentTime <= duration) {
        return { currentTime, duration };
      }
    }

    for (const element of root.querySelectorAll('time, span, [aria-valuetext], [data-qa*="time" i], [data-testid*="time" i], [class*="time" i]')) {
      const value = parseClockTime(element.textContent)
        || parseClockTime(element.getAttribute?.("aria-valuetext"));
      if (!value) continue;

      const hint = elementHint(element);
      if (/tooltip|preview|thumbnail/.test(hint)) continue;
      if (/duration|total/.test(hint)) durationCandidates.push(value);
      else if (/current|elapsed|position|played/.test(hint)) currentCandidates.push(value);
      clockCandidates.push(value);
    }
  }

  const duration = Math.max(...durationCandidates, ...clockCandidates, 0);
  const currentTime = currentCandidates.find((value) => value <= duration)
    ?? clockCandidates.find((value) => value < duration);
  return currentTime != null && duration > currentTime && duration <= 24 * 60 * 60
    ? { currentTime, duration }
    : null;
}

function isPrimePlaybackVideo(video) {
  if (provider !== "prime_video") return true;
  const visible = !video.hidden
    && video.clientWidth >= 320
    && video.clientHeight >= 180
    && (typeof video.getClientRects !== "function" || video.getClientRects().length > 0);
  if (!visible || (video.paused && Number(video.currentTime) <= 0)) return false;

  if (video.closest?.('[data-testid="draper-player"], [data-automation-id*="hero" i]')) return false;
  const playerRoot = video.closest?.("#dv-web-player");
  return Boolean(playerRoot && detectPlayerTimeline([playerRoot]));
}

function playbackMetrics(video, roots) {
  const currentTime = Number(video?.currentTime);
  if (!Number.isFinite(currentTime)) return null;

  const duration = Number(video?.duration);
  if (Number.isFinite(duration)
    && duration > 0
    && duration <= 24 * 60 * 60
    && currentTime <= duration + 30) {
    return { duration, currentTime: Math.max(0, Math.min(duration, currentTime)) };
  }

  const primePlayerRoot = provider === "prime_video" ? video?.closest?.("#dv-web-player") : null;
  const displayedTimeline = detectPlayerTimeline(primePlayerRoot ? [primePlayerRoot] : roots);
  if (displayedTimeline) return displayedTimeline;

  const seekable = video?.seekable;
  const rangeIndex = seekable?.length ? seekable.length - 1 : -1;
  const seekableStart = rangeIndex >= 0 ? Number(seekable.start(rangeIndex)) : 0;
  const seekableEnd = rangeIndex >= 0 ? Number(seekable.end(rangeIndex)) : 0;
  const hasSeekableTimeline = Number.isFinite(seekableStart)
    && Number.isFinite(seekableEnd)
    && seekableEnd > seekableStart
    && seekableEnd - seekableStart <= 24 * 60 * 60;
  const hasTimelineOffset = hasSeekableTimeline && currentTime >= seekableStart;

  const normalizedCurrentTime = hasTimelineOffset
    ? currentTime - seekableStart
    : currentTime;
  const normalizedDuration = Number.isFinite(duration) && duration > 0 && duration <= 24 * 60 * 60
    ? duration
    : (hasSeekableTimeline
    ? seekableEnd - seekableStart
    : 0);
  if (!Number.isFinite(normalizedDuration)
    || normalizedDuration <= 0
    || normalizedCurrentTime > normalizedDuration + 30) return null;

  return {
    duration: normalizedDuration,
    currentTime: Math.max(0, Math.min(normalizedDuration, normalizedCurrentTime)),
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

async function sendHeartbeat(roots, force = false) {
  const playback = playbackMetrics(activeVideo, roots);
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
        seasonNumber: activeEpisode?.seasonNumber ?? null,
        episodeNumber: activeEpisode?.episodeNumber ?? null,
        episodeTitle: activeEpisode?.episodeTitle ?? null,
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
    showNotice(
      response.title ?? activeTitle,
      response.synced
        ? "Posisi video mencapai 80%. Sudah disinkronkan ke riwayat."
        : "Selesai disimpan di extension. Sinkronisasi ke dashboard akan dicoba ulang.",
    );
  }
}

function onTimeUpdate() {
  if (!activeVideo || activeVideo.paused || activeVideo.seeking) return;
  void sendHeartbeat(activeRoots);
}

function onPause() {
  void sendHeartbeat(activeRoots, true);
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
  activePlaybackUrl = "";
  activeEpisode = null;
  activeSeasonNumber = null;
  lastHeartbeat = 0;
}

function scan() {
  if (!extensionAvailable) return;
  if (!ReelSync.isTrackablePlayback(provider, location.href)) {
    detachVideo();
    return;
  }
  const roots = getSearchRoots();
  activeRoots = roots;
  const title = detectTitle(roots);
  if (title && title !== activeTitle) activeSeasonNumber = null;
  const netflixMetadata = readNetflixMetadata();
  activeSeasonNumber = netflixMetadata?.seasonNumber ?? detectSeason(roots) ?? activeSeasonNumber;
  const fallbackEpisode = detectEpisode(roots, activeSeasonNumber);
  const detectedEpisode = netflixMetadata
    ? (netflixMetadata.type === "episode"
      && Number.isInteger(netflixMetadata.seasonNumber)
      && Number.isInteger(netflixMetadata.episodeNumber)
      ? {
        seasonNumber: netflixMetadata.seasonNumber,
        episodeNumber: netflixMetadata.episodeNumber,
        episodeTitle: fallbackEpisode?.episodeNumber === netflixMetadata.episodeNumber
          ? fallbackEpisode.episodeTitle
          : null,
      }
      : null)
    : fallbackEpisode;
  const playbackUrl = location.href.split(/[?#]/)[0];
  const samePlayback = title === activeTitle && playbackUrl === activePlaybackUrl;
  const episode = samePlayback && activeEpisode ? activeEpisode : detectedEpisode;
  if (title && (!samePlayback || (!activeEpisode && episode))) {
    activeTitle = title;
    activePlaybackUrl = playbackUrl;
    activeEpisode = episode;
    lastHeartbeat = 0;
    warningShownFor = "";
  }

  const video = roots.flatMap((root) => [...root.querySelectorAll("video")])
    .sort((a, b) => {
      const labeled = Number(Boolean(b.getAttribute?.("aria-label"))) - Number(Boolean(a.getAttribute?.("aria-label")));
      return labeled || b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight;
    })
    .find((candidate) => isPrimePlaybackVideo(candidate));
  if (provider === "prime_video" && !video) {
    detachVideo();
    return;
  }
  if (video) attachVideo(video);
  if (video && title) void sendHeartbeat(roots);
}

scanInterval = window.setInterval(scan, 3000);
scan();
