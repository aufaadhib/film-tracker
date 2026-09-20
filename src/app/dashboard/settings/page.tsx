import { ThemePicker } from "@/components/theme-picker";
import { CompletionThresholdForm } from "@/components/completion-threshold-form";
import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/watched";
import { ProviderRegionForm } from "@/components/provider-region-form";
import { getProviderCountryCode } from "@/lib/watchlist";
import { getWatchRegions } from "@/lib/tmdb";
import { getCompletionThreshold } from "@/lib/preferences";

export default async function SettingsPage() {
  const [user, countryCode, completionThreshold, regionResult] = await Promise.all([
    getCurrentUser(),
    getProviderCountryCode(),
    getCompletionThreshold(),
    getWatchRegions()
      .then((regions) => ({ regions, error: false }))
      .catch((error) => {
        console.error("TMDB watch regions lookup failed", error);
        return { regions: [{ code: "ID", name: "Indonesia" }], error: true };
      }),
  ]);
  const profile = user
    ? `${user.user_metadata?.full_name ?? "Penonton"} · ${user.email ?? "Tanpa email"}`
    : "Mode demo · data tidak disimpan ke akun";

  return (
    <div className="min-w-0">
      <header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted"><div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">AKUN & PREFERENSI</p><h1>Pengaturan.</h1></div><p>Atur tampilan dan akses akun Reelmark.</p></header>
      <section className="mt-6 grid gap-3">
        <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button:hover]:border-reel-blue"><div><h2>Profil</h2><p>{profile}</p></div></article>
        <ThemePicker />
        <CompletionThresholdForm threshold={completionThreshold} />
        {regionResult.error ? (
          <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button:hover]:border-reel-blue"><div><h2>Negara layanan streaming</h2><p>Daftar negara sedang tidak dapat dimuat. Coba buka halaman ini kembali nanti.</p></div></article>
        ) : <ProviderRegionForm regions={regionResult.regions} countryCode={countryCode} />}
        <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button:hover]:border-reel-blue"><div><h2>Privasi</h2><p>Riwayat dashboard tersimpan privat di akun Supabase dan dilindungi Row Level Security.</p></div></article>
        <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-[#bc3e3a] [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button]:text-white [&_button:hover]:border-reel-blue"><div><h2>Keluar dari akun</h2><p>Sesi di browser ini akan dihentikan.</p></div><form action={signOut}><button type="submit">Keluar</button></form></article>
      </section>
    </div>
  );
}
