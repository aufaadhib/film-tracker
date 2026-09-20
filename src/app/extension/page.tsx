import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CheckIcon, ExtensionIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import extensionManifest from "../../../extension/manifest.json";

const description = "Panduan memasang Reelmark Watch Detector untuk Chrome dan Edge.";
const extensionVersion = extensionManifest.version;
const extensionArchive = `reelmark-extension-${extensionVersion}.zip`;

export const metadata: Metadata = {
  title: "Extension Beta",
  description,
  alternates: { canonical: "/extension" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Reelmark",
    url: "/extension",
    title: "Extension Beta · Reelmark",
    description,
  },
  twitter: { card: "summary", title: "Extension Beta · Reelmark", description },
};

export default function ExtensionSetupPage() {
  return (
    <div className="min-h-screen [&>header]:flex [&>header]:min-h-17.5 [&>header]:items-center [&>header]:justify-between [&>header]:gap-4 [&>header]:border-b [&>header]:border-line [&>header]:bg-surface [&>header]:px-4.5 [&>header>div]:flex [&>header>div]:items-center [&>header>div]:gap-2 [&>header_a]:text-[.69rem] [&>header_a]:font-[750] [&>header_a:hover]:text-reel-blue [&>footer]:flex [&>footer]:min-h-17.5 [&>footer]:items-center [&>footer]:justify-between [&>footer]:gap-4 [&>footer]:border-t [&>footer]:border-line [&>footer]:bg-surface [&>footer]:px-4.5 [&>footer_a]:text-[.69rem] [&>footer_a]:font-[750] [&>footer_a:hover]:text-reel-blue [&_main]:mx-auto [&_main]:max-w-245 [&_main]:px-4.5 [&_main]:pt-17.5 [&_main]:pb-22.5 min-[768px]:[&>header]:px-10 min-[768px]:[&>footer]:px-10 min-[768px]:[&_main]:px-10">
      <header><Brand /><div><ThemeToggle className="grid size-9.5 cursor-pointer place-items-center rounded-[10px] border border-line bg-surface hover:border-reel-blue [&_span]:hidden" /><Link href="/dashboard/extension">Buka dashboard</Link></div></header>
      <main id="main-content">
        <section className="max-w-195 [&>svg]:mb-4 [&>svg]:block [&>svg]:text-reel-blue [&_h1]:m-0 [&_h1]:font-display [&_h1]:text-[clamp(3.2rem,10vw,6.2rem)] [&_h1]:leading-[.88] [&_h1]:tracking-[-.07em] [&_p]:mt-6 [&_p]:max-w-160 [&_p]:text-[.9rem] [&_p]:leading-[1.7] [&_p]:text-muted">
          <span className="mb-8.75 inline-block rounded-[7px] bg-warning px-2.25 py-1.75 font-mono text-[.5rem] font-bold tracking-[.08em] text-[#4f3500]">BETA · DEVELOPER MODE</span>
          <ExtensionIcon size={36} />
          <h1>Pasang detector<br />di browsermu.</h1>
          <p>Versi beta Reelmark dapat mendeteksi tontonan di Chrome dan Edge dengan ambang selesai yang dapat diatur. Instalasi masih menggunakan Developer mode dan belum tersedia di browser store.</p>
          <div className="mt-7 flex flex-col items-stretch gap-2.5 min-[600px]:flex-row min-[600px]:items-center">
            <a className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-reel-blue px-4.5 text-[.72rem] font-extrabold text-white hover:brightness-108" href={`/downloads/${extensionArchive}`} download>Unduh extension v{extensionVersion} (.zip)</a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-line-strong bg-surface px-4.5 text-[.72rem] font-extrabold text-ink hover:border-reel-blue hover:text-reel-blue" href="#steps-title">Lihat cara memasang</a>
          </div>
        </section>
        <section className="mt-20 [&>p]:font-mono [&>p]:text-[.54rem] [&>p]:font-bold [&>p]:tracking-[.11em] [&>p]:text-reel-blue [&>h2]:mt-2 [&>h2]:mb-6 [&>h2]:font-display [&>h2]:text-[2rem] [&>h2]:tracking-[-.045em] [&_ol]:m-0 [&_ol]:list-none [&_ol]:border-t [&_ol]:border-line [&_ol]:p-0 [&_li]:grid [&_li]:grid-cols-[48px_minmax(0,1fr)] [&_li]:gap-3 [&_li]:border-b [&_li]:border-line [&_li]:py-5.5 min-[768px]:[&_li]:grid-cols-[70px_minmax(0,1fr)] [&_li>span]:font-mono [&_li>span]:text-[.62rem] [&_li>span]:text-reel-blue [&_h3]:mt-0 [&_h3]:mb-1.75 [&_h3]:text-[.84rem] [&_li_p]:m-0 [&_li_p]:text-[.75rem] [&_li_p]:leading-[1.55] [&_li_p]:text-muted [&_code]:rounded-[5px] [&_code]:bg-surface-soft [&_code]:px-1.25 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.65rem] [&_code]:text-ink" aria-labelledby="steps-title">
          <p>INSTALASI · ± 2 MENIT</p>
          <h2 id="steps-title">Chrome atau Edge</h2>
          <ol>
            <li><span>01</span><div><h3>Unduh dan ekstrak ZIP</h3><p>Tekan tombol unduh di atas, lalu ekstrak <code>{extensionArchive}</code>.</p></div></li>
            <li><span>02</span><div><h3>Buka halaman extension</h3><p>Kunjungi <code>chrome://extensions</code> atau <code>edge://extensions</code>.</p></div></li>
            <li><span>03</span><div><h3>Aktifkan Developer mode</h3><p>Gunakan toggle Developer mode yang ada pada halaman tersebut.</p></div></li>
            <li><span>04</span><div><h3>Pilih Load unpacked</h3><p>Pilih folder hasil ekstraksi yang berisi file <code>manifest.json</code>.</p></div></li>
            <li><span>05</span><div><h3>Refresh tab streaming</h3><p>Setelah memasang atau me-reload extension, refresh tab Netflix atau platform lain sebelum mulai menonton.</p></div></li>
          </ol>
        </section>
        <aside className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.25 rounded-[15px] bg-console p-5 text-[#f5f7fa] [&_svg]:text-watched-mint [&_h2]:mt-0 [&_h2]:mb-1.5 [&_h2]:text-[.84rem] [&_p]:m-0 [&_p]:text-[.7rem] [&_p]:leading-[1.55] [&_p]:text-[#9aa6b6] [&>span]:font-mono [&>span]:text-[.48rem] [&>span]:text-watched-mint"><CheckIcon size={22} /><div><h2>Yang sudah bekerja</h2><p>Deteksi empat platform, progres posisi video, antrean offline, serta login dan sinkronisasi ke dashboard Reelmark.</p></div><span>BETA</span></aside>
        <aside className="mt-5 rounded-[15px] border border-[color-mix(in_srgb,var(--warning)_55%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface))] p-5 [&_strong]:mb-1.75 [&_strong]:block [&_strong]:text-[.75rem] [&_p]:m-0 [&_p]:text-[.7rem] [&_p]:leading-[1.55] [&_p]:text-muted"><strong>Setelah instalasi</strong><p>Buka popup extension lalu pilih Masuk dengan Google. Distribusi Chrome Web Store belum tersedia.</p></aside>
      </main>
      <footer><Brand /><Link href="/">← Kembali ke landing</Link></footer>
    </div>
  );
}
