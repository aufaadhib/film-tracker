const netflixHost = "www.netflix.com";
const netflixPath = /^\/(?:watch|title)\/\d+\/?$/;

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith("#")) {
      const hexadecimal = key[1]?.toLocaleLowerCase() === "x";
      const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return entities[key.toLocaleLowerCase()] ?? entity;
  });
}

function cleanNetflixTitle(value: string) {
  const withoutSuffix = decodeHtml(value)
    .replace(/\s*(?:\||[-–—])\s*Netflix(?:\s+Official Site)?\s*$/i, "")
    .trim();
  return withoutSuffix.replace(/^Watch\s+/i, "").trim() || null;
}

function metaContent(html: string, wanted: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/gi)) {
      attributes.set(match[1].toLocaleLowerCase(), match[3]);
    }
    if ((attributes.get("property") ?? attributes.get("name"))?.toLocaleLowerCase() === wanted) {
      return attributes.get("content") ?? null;
    }
  }
  return null;
}

export function extractNetflixEnglishTitle(html: string) {
  const value = metaContent(html, "og:title")
    ?? metaContent(html, "twitter:title")
    ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return value ? cleanNetflixTitle(value) : null;
}

export function parseNetflixWatchUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== netflixHost || !netflixPath.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function resolveNetflixEnglishTitle(value?: string | null) {
  let url = parseNetflixWatchUrl(value);
  if (!url) return null;

  try {
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { "Accept-Language": "en-US,en;q=0.9" },
        redirect: "manual",
        signal: AbortSignal.timeout(7000),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        url = parseNetflixWatchUrl(new URL(location, url).toString());
        if (!url) return null;
        continue;
      }

      if (!response.ok) return null;
      return extractNetflixEnglishTitle(await response.text());
    }
  } catch {
    return null;
  }

  return null;
}
