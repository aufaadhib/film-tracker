import { z } from "zod";
import { getCatalogTitle, searchCatalog } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q"));

  if (!query.success) {
    return Response.json(
      { error: "Masukkan minimal 2 karakter dan maksimal 100 karakter." },
      { status: 400 },
    );
  }

  try {
    const catalog = await searchCatalog(query.data);
    const detailResults = await Promise.allSettled(catalog.results.slice(0, 6).map((item) =>
      item.mediaType === "tv" ? getCatalogTitle(item.tmdbId, "tv") : Promise.resolve(item),
    ));
    const results = catalog.results.slice(0, 6).map((item, index) => {
      const detail = detailResults[index];
      return detail?.status === "fulfilled" && detail.value
        ? { ...item, seriesStatus: detail.value.seriesStatus }
        : item;
    });
    const supabase = await createClient();
    const { data: authData, error: authError } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null }, error: null };
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Catalog user lookup failed", JSON.stringify({ name: authError.name, message: authError.message }));
      return Response.json({ error: "Sesi pengguna sedang tidak dapat diverifikasi." }, { status: 503 });
    }
    const user = authData.user;
    const watched = new Map<string, { watchedAt: string; watchCount: number }>();
    const watchlist = new Map<string, { id: string; isPriority: boolean }>();

    if (supabase && user && results.length) {
      const ids = results.map((item) => item.tmdbId);
      const { data: titles, error: titlesError } = await supabase.from("catalog_titles").select("id,tmdb_id,media_type").in("tmdb_id", ids);
      if (titlesError) {
        console.error("Catalog watched-title lookup failed", JSON.stringify({ code: titlesError.code, message: titlesError.message }));
        return Response.json({ error: "Status riwayat sedang tidak dapat dimuat." }, { status: 503 });
      }
      if (titles?.length) {
        const titleById = new Map(titles.map((title) => [title.id, `${title.media_type}:${title.tmdb_id}`]));
        const titleIds = titles.map((title) => title.id);
        const [statesResult, watchlistResult] = await Promise.all([
          supabase
            .from("user_media_state")
            .select("title_id,last_watched_at,watch_count")
            .eq("user_id", user.id)
            .is("episode_id", null)
            .in("title_id", titleIds),
          supabase
            .from("user_watchlist")
            .select("id,title_id,is_priority")
            .eq("user_id", user.id)
            .in("title_id", titleIds),
        ]);
        const { data: states, error: statesError } = statesResult;
        if (statesError) {
          console.error("Catalog watched-state lookup failed", JSON.stringify({ code: statesError.code, message: statesError.message }));
          return Response.json({ error: "Status riwayat sedang tidak dapat dimuat." }, { status: 503 });
        }
        states?.forEach((state) => {
          const key = titleById.get(state.title_id);
          if (key) watched.set(key, { watchedAt: state.last_watched_at, watchCount: state.watch_count });
        });
        const { data: watchlistRows, error: watchlistError } = watchlistResult;
        if (watchlistError) {
          console.error("Catalog watchlist lookup failed", JSON.stringify({ code: watchlistError.code, message: watchlistError.message }));
          return Response.json({ error: "Status watchlist sedang tidak dapat dimuat." }, { status: 503 });
        }
        watchlistRows?.forEach((row) => {
          const key = titleById.get(row.title_id);
          if (key) watchlist.set(key, { id: row.id, isPriority: row.is_priority });
        });
      }
    }

    return Response.json({
      ...catalog,
      results: results.map((item) => ({
        ...item,
        watched: watched.get(`${item.mediaType}:${item.tmdbId}`) ?? null,
        watchlist: watchlist.get(`${item.mediaType}:${item.tmdbId}`) ?? null,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Catalog search failed", error);
    return Response.json(
      { error: "Katalog film sedang tidak bisa diakses. Coba lagi sebentar." },
      { status: 502 },
    );
  }
}
