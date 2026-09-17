const genericTitles: Record<string, string[]> = {
  netflix: ["netflix"],
  disney: ["disney+", "disney plus"],
  prime_video: ["prime video", "amazon prime video"],
  max: ["max", "hbo max"],
};

export function isUsefulDetectedTitle(title: string, provider: string) {
  const normalized = title.trim().toLocaleLowerCase("en-US").replace(/^\(\d+\)\s*/, "");
  return Boolean(normalized) && !(genericTitles[provider] ?? []).includes(normalized);
}

export function isTrackableProviderUrl(provider: string, value: string | null) {
  if (provider !== "netflix" && provider !== "disney" && provider !== "prime_video") return true;
  return normalizeProviderUrl(provider, value) !== null;
}

export function normalizeProviderUrl(provider: string, value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (provider === "netflix") {
      return url.hostname === "www.netflix.com" && /^\/watch\/[^/]+/.test(url.pathname)
        ? `https://www.netflix.com${url.pathname.replace(/\/$/, "")}`
        : null;
    }
    if (provider === "disney") {
      return ["disneyplus.com", "www.disneyplus.com"].includes(url.hostname)
        && /^\/(?:[a-z]{2}-[a-z]{2}\/)?play\/[^/]+/i.test(url.pathname)
        ? `https://disneyplus.com${url.pathname.replace(/\/$/, "")}`
        : null;
    }
    if (provider === "prime_video") {
      const contentId = url.pathname.match(/\/detail\/([^/]+)/i)?.[1];
      return url.hostname === "www.primevideo.com" && contentId
        ? `https://www.primevideo.com/detail/${contentId}`
        : null;
    }
    if (provider === "max" && url.hostname === "play.max.com") {
      return `https://play.max.com${url.pathname.replace(/\/$/, "")}`;
    }
    return null;
  } catch {
    return null;
  }
}
