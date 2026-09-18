export type ReleaseState = "released" | "upcoming" | "unknown";

export function getReleaseState(releaseDate: string | null | undefined, now = new Date()): ReleaseState {
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return "unknown";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return releaseDate > today ? "upcoming" : "released";
}

export function formatReleaseDate(releaseDate: string | null | undefined) {
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return "Tanggal belum diumumkan";
  const [year, month, day] = releaseDate.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export type RawWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
};

export type WatchProvider = {
  id: number;
  name: string;
  logoPath: string | null;
  categories: Array<"flatrate" | "free" | "ads">;
};

export type RawWatchNetwork = {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string | null;
};

export type WatchNetwork = {
  id: number;
  name: string;
  logoPath: string | null;
  originCountry: string | null;
};

export function normalizeWatchNetworks(networks: RawWatchNetwork[]): WatchNetwork[] {
  return networks.map((network) => ({
    id: network.id,
    name: network.name,
    logoPath: network.logo_path,
    originCountry: network.origin_country,
  }));
}

export function normalizeWatchProviders(region: {
  flatrate?: RawWatchProvider[];
  free?: RawWatchProvider[];
  ads?: RawWatchProvider[];
}): WatchProvider[] {
  const merged = new Map<number, WatchProvider & { priority: number }>();
  for (const category of ["flatrate", "free", "ads"] as const) {
    for (const provider of region[category] ?? []) {
      const current = merged.get(provider.provider_id);
      if (current) {
        if (!current.categories.includes(category)) current.categories.push(category);
        current.priority = Math.min(current.priority, provider.display_priority);
        continue;
      }
      merged.set(provider.provider_id, {
        id: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path,
        categories: [category],
        priority: provider.display_priority,
      });
    }
  }
  return [...merged.values()]
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      logoPath: provider.logoPath,
      categories: provider.categories,
    }));
}
