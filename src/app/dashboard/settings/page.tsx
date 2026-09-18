import { ThemePicker } from "@/components/theme-picker";
import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/watched";
import { ProviderRegionForm } from "@/components/provider-region-form";
import { getProviderCountryCode } from "@/lib/watchlist";
import { getWatchRegions } from "@/lib/tmdb";
import styles from "../dashboard.module.css";

export default async function SettingsPage() {
  const [user, countryCode, regionResult] = await Promise.all([
    getCurrentUser(),
    getProviderCountryCode(),
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
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>AKUN & PREFERENSI</p><h1>Pengaturan.</h1></div><p>Atur tampilan dan akses akun Reelmark.</p></header>
      <section className={styles.settingsList}>
        <article className={styles.setting}><div><h2>Profil</h2><p>{profile}</p></div></article>
        <ThemePicker />
        {regionResult.error ? (
          <article className={styles.setting}><div><h2>Negara layanan streaming</h2><p>Daftar negara sedang tidak dapat dimuat. Coba buka halaman ini kembali nanti.</p></div></article>
        ) : <ProviderRegionForm regions={regionResult.regions} countryCode={countryCode} />}
        <article className={styles.setting}><div><h2>Privasi</h2><p>Riwayat dashboard tersimpan privat di akun Supabase dan dilindungi Row Level Security.</p></div></article>
        <article className={`${styles.setting} ${styles.danger}`}><div><h2>Keluar dari akun</h2><p>Sesi di browser ini akan dihentikan.</p></div><form action={signOut}><button type="submit">Keluar</button></form></article>
      </section>
    </div>
  );
}
