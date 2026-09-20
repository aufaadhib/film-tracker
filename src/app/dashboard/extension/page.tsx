import Link from "next/link";
import { CheckIcon, ExtensionIcon, FilmIcon, SettingsIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { getCompletionThreshold } from "@/lib/preferences";
import { ExtensionPairing } from "./extension-pairing";
import { revokeExtensionDevice } from "./actions";

export default async function ExtensionPage() {
  const supabase = await createClient();
  const devicesPromise = supabase
    ? supabase
      .from("extension_devices")
      .select("id,device_name,last_seen_at,last_sync_at")
      .order("last_seen_at", { ascending: false })
    : { data: [], error: null };
  const [{ data: devices, error }, completionThreshold] = await Promise.all([
    devicesPromise,
    getCompletionThreshold(),
  ]);

  const migrationMissing = error?.code === "42703" || error?.code === "PGRST204" || error?.code === "PGRST205";
  if (error && !migrationMissing) {
    console.error("Extension devices query failed", JSON.stringify({ code: error.code, message: error.message }));
    throw new Error("Status extension tidak dapat dimuat.");
  }

  const databaseReady = Boolean(supabase) && !migrationMissing;
  const connected = Boolean(devices?.length);

  return (
    <div className="min-w-0">
      <header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted">
        <div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">BROWSER DETECTOR</p><h1>Extension beta.</h1></div>
        <Link className="inline-flex min-h-10.5 items-center gap-2 rounded-[10px] bg-watched-mint px-3.5 text-[.72rem] font-extrabold text-[#071019] hover:bg-[#75e4ba]" href="/extension">Panduan instalasi →</Link>
      </header>
      <div className="mt-6 grid gap-3.5 rounded-2xl border border-line bg-surface p-5 [&>span]:justify-self-start [&>span]:rounded-[7px] [&>span]:bg-warning [&>span]:px-2 [&>span]:py-1.5 [&>span]:font-mono [&>span]:text-[.48rem] [&>span]:font-bold [&>span]:text-[#4f3500] [&_h2]:font-display [&_h2]:text-[1.4rem] [&_p]:max-w-162.5 [&_p]:text-[.76rem] [&_p]:leading-[1.6] [&_p]:text-muted">
        <span>{!databaseReady ? "DATABASE BELUM SIAP" : connected ? "TERHUBUNG" : "SIAP DIPASANGKAN"}</span>
        <h2>{!databaseReady
          ? "Selesaikan konfigurasi Supabase terlebih dahulu"
          : connected ? `${devices!.length} browser terhubung` : "Masuk melalui popup extension"}</h2>
        <p>{!databaseReady
          ? migrationMissing
            ? "Tabel extension belum tersedia. Jalankan migration Supabase terbaru, lalu muat ulang halaman ini."
            : "Supabase belum dikonfigurasi. Tambahkan environment variable yang diperlukan untuk mengaktifkan pairing."
          : connected
          ? `Tontonan yang mencapai ${completionThreshold}% akan dicoba sinkronkan otomatis. Riwayat lokal tetap disimpan sebagai antrean ketika jaringan terputus.`
          : "Buka popup extension lalu pilih Masuk dengan Google. Reelmark akan menghubungkan browser ini ke akunmu secara otomatis."}</p>
        {devices?.length ? (
          <ul className="mt-0.5 grid list-none gap-2 p-0 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-3 [&_li]:rounded-[10px] [&_li]:border [&_li]:border-line [&_li]:bg-surface-soft [&_li]:px-3 [&_li]:py-2.75 max-[520px]:[&_li]:flex-col max-[520px]:[&_li]:items-stretch [&_li>div]:grid [&_li>div]:min-w-0 [&_li>div]:gap-0.75 [&_strong]:text-[.72rem] [&_span]:text-[.6rem] [&_span]:text-muted [&_button]:cursor-pointer [&_button]:whitespace-nowrap [&_button]:rounded-lg [&_button]:border [&_button]:border-line-strong [&_button]:bg-transparent [&_button]:px-2.25 [&_button]:py-1.75 [&_button]:text-[.58rem] [&_button]:font-bold [&_button]:text-[#bc3e3a] max-[520px]:[&_button]:min-h-9.5 max-[520px]:[&_button]:w-full">
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
      <section className="mt-6 grid gap-3 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
        <article className="rounded-[15px] border border-line bg-surface p-5 [&_svg]:text-reel-blue [&_h2]:mt-8.5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-[-.03em] [&_p]:text-[.73rem] [&_p]:leading-[1.55] [&_p]:text-muted"><ExtensionIcon size={24} /><h2>4 platform</h2><p>Netflix, Disney+, Prime Video, dan Max pada Chrome atau Edge.</p></article>
        <article className="rounded-[15px] border border-line bg-surface p-5 [&_svg]:text-reel-blue [&_h2]:mt-8.5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-[-.03em] [&_p]:text-[.73rem] [&_p]:leading-[1.55] [&_p]:text-muted"><FilmIcon size={24} /><h2>Ambang {completionThreshold}%</h2><p>Judul ditandai selesai mengikuti preferensi akunmu di halaman Pengaturan.</p></article>
        <article className="rounded-[15px] border border-line bg-surface p-5 [&_svg]:text-reel-blue [&_h2]:mt-8.5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-[-.03em] [&_p]:text-[.73rem] [&_p]:leading-[1.55] [&_p]:text-muted"><SettingsIcon size={24} /><h2>Antrean lokal</h2><p>Riwayat tetap berada di browser sampai backend mengonfirmasi sinkronisasi.</p></article>
        <article className="rounded-[15px] border border-line bg-surface p-5 [&_svg]:text-reel-blue [&_h2]:mt-8.5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-[-.03em] [&_p]:text-[.73rem] [&_p]:leading-[1.55] [&_p]:text-muted"><CheckIcon size={24} /><h2>Kontrol pengguna</h2><p>Extension hanya berjalan pada host platform streaming yang tercantum di manifest.</p></article>
      </section>
    </div>
  );
}
