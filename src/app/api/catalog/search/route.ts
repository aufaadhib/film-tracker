import { z } from "zod";
import { searchCatalog } from "@/lib/tmdb";
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

    if (supabase && user && catalog.results.length) {
      const ids = catalog.results.map((item) => item.tmdbId);
      const { data: titles, error: titlesError } = await supabase.from("catalog_titles").select("id,tmdb_id,media_type").in("tmdb_id", ids);
      if (titlesError) {
        console.error("Catalog watched-title lookup failed", JSON.stringify({ code: titlesError.code, message: titlesError.message }));
        return Response.json({ error: "Status riwayat sedang tidak dapat dimuat." }, { status: 503 });
      }
      if (titles?.length) {
        const titleById = new Map(titles.map((title) => [title.id, `${title.media_type}:${title.tmdb_id}`]));
        const { data: states, error: statesError } = await supabase
          .from("user_media_state")
          .select("title_id,last_watched_at,watch_count")
          .eq("user_id", user.id)
          .is("episode_id", null)
          .in("title_id", titles.map((title) => title.id));
        if (statesError) {
          console.error("Catalog watched-state lookup failed", JSON.stringify({ code: statesError.code, message: statesError.message }));
          return Response.json({ error: "Status riwayat sedang tidak dapat dimuat." }, { status: 503 });
        }
        states?.forEach((state) => {
          const key = titleById.get(state.title_id);
          if (key) watched.set(key, { watchedAt: state.last_watched_at, watchCount: state.watch_count });
        });
      }
    }

    return Response.json({
      ...catalog,
      results: catalog.results.map((item) => ({ ...item, watched: watched.get(`${item.mediaType}:${item.tmdbId}`) ?? null })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Catalog search failed", error);
    return Response.json(
      { error: "Katalog film sedang tidak bisa diakses. Coba lagi sebentar." },
      { status: 502 },
    );
  }
}
