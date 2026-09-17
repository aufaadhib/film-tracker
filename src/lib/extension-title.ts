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
