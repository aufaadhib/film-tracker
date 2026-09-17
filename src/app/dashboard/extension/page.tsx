import Link from "next/link";
import { CheckIcon, ExtensionIcon, FilmIcon, SettingsIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { ExtensionPairing } from "./extension-pairing";
import { revokeExtensionDevice } from "./actions";
import styles from "../dashboard.module.css";

export default async function ExtensionPage() {
  const supabase = await createClient();
  const { data: devices, error } = supabase
    ? await supabase
      .from("extension_devices")
      .select("id,device_name,last_seen_at,last_sync_at")
      .order("last_seen_at", { ascending: false })
    : { data: [], error: null };

  const migrationMissing = error?.code === "42703" || error?.code === "PGRST204" || error?.code === "PGRST205";
  if (error && !migrationMissing) {
    console.error("Extension devices query failed", JSON.stringify({ code: error.code, message: error.message }));
    throw new Error("Status extension tidak dapat dimuat.");
  }

  const databaseReady = Boolean(supabase) && !migrationMissing;
  const connected = Boolean(devices?.length);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>BROWSER DETECTOR</p><h1>Extension beta.</h1></div>
        <Link className={styles.primaryAction} href="/extension">Panduan instalasi →</Link>
      </header>
      <div className={styles.statusBox}>
        <span>{!databaseReady ? "DATABASE BELUM SIAP" : connected ? "TERHUBUNG" : "SIAP DIPASANGKAN"}</span>
        <h2>{!databaseReady
          ? "Selesaikan konfigurasi Supabase terlebih dahulu"
          : connected ? `${devices!.length} browser terhubung` : "Masuk melalui popup extension"}</h2>
        <p>{!databaseReady
          ? migrationMissing
            ? "Tabel extension belum tersedia. Jalankan migration Supabase terbaru, lalu muat ulang halaman ini."
            : "Supabase belum dikonfigurasi. Tambahkan environment variable yang diperlukan untuk mengaktifkan pairing."
          : connected
          ? "Tontonan yang mencapai 80% akan dicoba sinkronkan otomatis. Riwayat lokal tetap disimpan sebagai antrean ketika jaringan terputus."
          : "Buka popup extension lalu pilih Masuk dengan Google. Reelmark akan menghubungkan browser ini ke akunmu secara otomatis."}</p>
        {devices?.length ? (
          <ul className={styles.deviceList}>
            {devices.map((device) => (
              <li key={device.id}>
                <div>
                  <strong>{device.device_name}</strong>
                  <span>{device.last_sync_at
                    ? `Sinkron terakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(device.last_sync_at))}`
                    : "Terhubung, belum ada tontonan tersinkron"}</span>
                </div>
                <form action={revokeExtensionDevice}>
                  <input type="hidden" name="deviceId" value={device.id} />
                  <button type="submit">Cabut akses</button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {databaseReady ? <ExtensionPairing /> : null}
      <section className={styles.featureGrid}>
        <article className={styles.featureCard}><ExtensionIcon size={24} /><h2>4 platform</h2><p>Netflix, Disney+, Prime Video, dan Max pada Chrome atau Edge.</p></article>
        <article className={styles.featureCard}><FilmIcon size={24} /><h2>Ambang 80%</h2><p>Hanya bagian waktu unik yang dihitung agar seek dan replay tidak menggandakan progres.</p></article>
        <article className={styles.featureCard}><SettingsIcon size={24} /><h2>Antrean lokal</h2><p>Riwayat tetap berada di browser sampai backend mengonfirmasi sinkronisasi.</p></article>
        <article className={styles.featureCard}><CheckIcon size={24} /><h2>Kontrol pengguna</h2><p>Extension hanya berjalan pada host platform streaming yang tercantum di manifest.</p></article>
      </section>
    </div>
  );
}
