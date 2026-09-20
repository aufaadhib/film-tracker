import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CheckIcon, ExtensionIcon, FilmIcon, HistoryIcon } from "@/components/icons";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/watched";

const platforms = ["Netflix", "Disney+", "Prime Video", "Max"];
const description = "Catat film dan episode yang sudah kamu tonton, otomatis maupun manual.";

export const metadata: Metadata = {
  title: { absolute: "Reelmark — Riwayat tontonanmu" },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Reelmark",
    url: "/",
    title: "Reelmark — Riwayat tontonanmu",
    description,
  },
  twitter: { card: "summary", title: "Reelmark — Riwayat tontonanmu", description },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/auth/login?next=/dashboard";

  return (
    <div className="overflow-hidden">
      <header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-6 border-b border-line bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-[clamp(18px,4vw,64px)] backdrop-blur-[18px] [&_nav]:hidden [&_nav]:items-center [&_nav]:gap-6.5 [&_nav]:text-[.78rem] [&_nav]:font-[650] [&_nav]:text-muted min-[768px]:[&_nav]:flex [&_nav_a:hover]:text-ink">
        <Brand />
        <nav aria-label="Navigasi landing">
          <Link href="#cara-kerja">Cara kerja</Link>
          <Link href="#platform">Platform</Link>
          <Link href="#privasi">Privasi</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="grid size-10 cursor-pointer place-items-center rounded-[11px] border border-line bg-surface [&_span]:hidden" />
          <Link className="rounded-[11px] border border-line-strong px-3.5 py-2.5 text-[.75rem] font-[750] hover:text-ink max-[430px]:hidden" href={primaryHref}>{user ? "Buka dashboard" : "Masuk"}</Link>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid min-h-170 max-w-360 items-center gap-13 px-4.5 pt-19 pb-21 [&_h1]:my-4.5 [&_h1]:mb-6 [&_h1]:max-w-190 [&_h1]:text-balance [&_h1]:font-display [&_h1]:text-[clamp(3.55rem,14vw,7.3rem)] [&_h1]:leading-[.88] [&_h1]:font-[720] [&_h1]:tracking-[-.075em] [&_h1_em]:font-normal [&_h1_em]:text-reel-blue min-[768px]:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)] min-[768px]:px-10 min-[1200px]:px-16">
          <div className="min-w-0">
            <p className="font-mono text-[.64rem] font-bold tracking-[.13em] text-reel-blue [&_span]:mr-2 [&_span]:inline-block [&_span]:size-1.75 [&_span]:rounded-full [&_span]:bg-live-coral [&_span]:shadow-[0_0_0_5px_rgb(255_107_99/12%)]"><span /> DETEKTOR TONTONAN PRIBADI</p>
            <h1>Film selesai.<br /><em>Ingatan tersimpan.</em></h1>
            <p className="max-w-147.5 text-pretty text-[clamp(.98rem,2vw,1.13rem)] leading-[1.65] text-ink-soft">Reelmark mengingat film dan serial yang pernah kamu tonton—otomatis dari browser atau dicatat manual dalam hitungan detik.</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-watched-mint px-4.5 text-[.78rem] font-extrabold text-[#071019] hover:bg-[#75e4ba] [&_span]:text-base" href={primaryHref}>{user ? "Buka dashboard" : "Mulai gratis"} <span>→</span></Link>
              <PwaInstallButton className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface px-4.5 text-[.78rem] font-extrabold hover:border-reel-blue disabled:cursor-wait disabled:opacity-65" />
              <Link className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface px-4.5 text-[.78rem] font-extrabold hover:border-reel-blue disabled:cursor-wait disabled:opacity-65" href="/extension"><ExtensionIcon size={18} /> Pasang extension beta</Link>
            </div>
            <p className="mt-3.5 text-[.68rem] text-muted">Chrome & Edge · Netflix, Disney+, Prime Video, dan Max</p>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-[22px] border border-console-line bg-console p-4.5 text-[#f5f7fa] shadow-[0_40px_90px_rgb(5_10_18/28%)] before:absolute before:-top-40 before:-right-30 before:size-70 before:rounded-full before:bg-reel-blue before:opacity-24 before:blur-[80px] before:content-[''] min-[768px]:p-5.5 min-[1200px]:transform-[perspective(1000px)_rotateY(-3deg)_rotateX(1deg)]" aria-label="Contoh deteksi Reelmark">
            <div className="relative flex justify-between border-b border-console-line pb-3.75 font-mono text-[.53rem] tracking-[.08em] text-[#929eae] [&_span:first-child]:flex [&_span:first-child]:items-center [&_span:first-child]:gap-2 [&_span:first-child]:text-watched-mint [&_i]:size-1.75 [&_i]:rounded-full [&_i]:bg-current"><span><i /> REELMARK DETECTOR</span><span>21:48:06</span></div>
            <div className="relative grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-3.5 py-7.5 max-[430px]:grid-cols-[60px_minmax(0,1fr)] max-[430px]:[&>strong]:col-2 [&>strong]:font-mono [&>strong]:text-[.9rem] [&>strong]:text-watched-mint [&>strong]:tabular-nums">
              <div className="grid h-24.5 w-17.5 place-items-center rounded-[10px] border border-[#374154] bg-[linear-gradient(145deg,#212a39,#111722)] text-reel-blue max-[430px]:h-21 max-[430px]:w-15"><FilmIcon size={34} /></div>
              <div className="min-w-0 [&_p]:mb-1.75 [&_p]:font-mono [&_p]:text-[.49rem] [&_p]:tracking-[.08em] [&_p]:text-reel-blue [&_h2]:mb-1.5 [&_h2]:overflow-hidden [&_h2]:text-ellipsis [&_h2]:whitespace-nowrap [&_h2]:font-display [&_h2]:text-[1.42rem] [&_h2]:tracking-[-.04em] [&_span]:text-[.67rem] [&_span]:text-[#929eae]"><p>SEKARANG DIPUTAR · NETFLIX</p><h2>Glass Onion</h2><span>Film · 2022</span></div>
              <strong>78%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-[99px] bg-[#252e3c] [&_span]:block [&_span]:h-full [&_span]:w-[78%] [&_span]:rounded-[inherit] [&_span]:bg-[linear-gradient(90deg,var(--reel-blue),var(--watched-mint))]"><span /></div>
            <div className="flex justify-between gap-2 px-0 pt-2.25 pb-5.75 font-mono text-[.45rem] text-[#6f7b8c] [&_b]:font-normal [&_b]:text-warning"><span>00:00</span><b>Ambang default · 80%</b><span>02:19:00</span></div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[11px] border border-[#263242] bg-console-panel p-3 text-[.63rem] text-[#c7d0dc] [&_svg]:text-watched-mint [&_time]:font-mono [&_time]:text-[.48rem] [&_time]:text-[#778395]"><CheckIcon size={18} /><span><strong>Past Lives</strong> ditandai sudah ditonton</span><time>kemarin</time></div>
          </div>
        </section>

        <section className="grid scroll-mt-18 gap-4.5 border-y border-line bg-surface px-4.5 py-7 text-center [&_p]:font-mono [&_p]:text-[.55rem] [&_p]:tracking-[.12em] [&_p]:text-muted [&_small]:font-mono [&_small]:text-[.55rem] [&_small]:tracking-[.12em] [&_small]:text-warning [&_div]:flex [&_div]:flex-wrap [&_div]:justify-center [&_div]:gap-x-7.5 [&_div]:gap-y-4 [&_div_span]:font-display [&_div_span]:text-[1.05rem] [&_div_span]:font-bold" id="platform" aria-labelledby="platform-title">
          <p id="platform-title">BEKERJA SAAT KAMU MENONTON DI</p>
          <div>{platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
          <small>Versi beta</small>
        </section>

        <section className="mx-auto max-w-320 scroll-mt-18 px-4.5 py-24 min-[1200px]:py-32.5" id="cara-kerja">
          <div className="max-w-172.5 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[clamp(2.35rem,7vw,4.6rem)] [&_h2]:leading-[.97] [&_h2]:tracking-[-.06em]"><p className="font-mono text-[.64rem] font-bold tracking-[.13em] text-reel-blue [&_span]:mr-2 [&_span]:inline-block [&_span]:size-1.75 [&_span]:rounded-full [&_span]:bg-live-coral [&_span]:shadow-[0_0_0_5px_rgb(255_107_99/12%)]">CARA KERJA</p><h2>Menonton tetap biasa.<br />Catatannya yang otomatis.</h2></div>
          <div className="mt-10.5 grid gap-3 min-[768px]:grid-cols-3 [&_article]:relative [&_article]:min-h-65 [&_article]:rounded-[18px] [&_article]:border [&_article]:border-line [&_article]:bg-surface [&_article]:p-6 [&_article>span]:absolute [&_article>span]:top-5 [&_article>span]:right-5.5 [&_article>span]:font-mono [&_article>span]:text-[.7rem] [&_article>span]:text-line-strong [&_article>svg]:text-reel-blue [&_h3]:mt-19 [&_h3]:mb-2.5 [&_h3]:font-display [&_h3]:text-[1.35rem] [&_h3]:tracking-[-.035em] [&_p]:text-[.82rem] [&_p]:leading-[1.65] [&_p]:text-muted">
            <article><span>01</span><ExtensionIcon size={24} /><h3>Pasang detector</h3><p>Aktifkan extension beta di Chrome atau Edge dan pilih platform yang ingin dipantau.</p></article>
            <article><span>02</span><FilmIcon size={24} /><h3>Putar seperti biasa</h3><p>Reelmark membaca posisi video untuk menampilkan progres tontonanmu.</p></article>
            <article><span>03</span><HistoryIcon size={24} /><h3>Buka arsipmu</h3><p>Setelah ambang akun tercapai, judul masuk ke antrean extension dan disinkronkan ke akun yang sudah dipasangkan.</p></article>
          </div>
        </section>

        <section className="mx-auto grid max-w-320 scroll-mt-18 items-center gap-12 px-4.5 py-24 min-[768px]:grid-cols-[.75fr_1.25fr] min-[1200px]:py-32.5">
          <div className="[&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[clamp(2.35rem,7vw,4.6rem)] [&_h2]:leading-[.97] [&_h2]:tracking-[-.06em] [&>p:not(.eyebrow)]:mt-5 [&>p:not(.eyebrow)]:max-w-127.5 [&>p:not(.eyebrow)]:text-[.82rem] [&>p:not(.eyebrow)]:leading-[1.65] [&>p:not(.eyebrow)]:text-muted [&>a]:mt-6 [&>a]:inline-flex [&>a]:gap-2 [&>a]:text-[.78rem] [&>a]:font-extrabold [&>a]:text-reel-blue">
            <p className="font-mono text-[.64rem] font-bold tracking-[.13em] text-reel-blue [&_span]:mr-2 [&_span]:inline-block [&_span]:size-1.75 [&_span]:rounded-full [&_span]:bg-live-coral [&_span]:shadow-[0_0_0_5px_rgb(255_107_99/12%)]">SATU ARSIP</p>
            <h2>Semua jejak tontonan, tanpa spreadsheet.</h2>
            <p>Cari film manual, lihat kapan terakhir menonton, dan temukan judul yang pernah kamu selesaikan.</p>
            <Link href={primaryHref}>Lihat dashboard <span>→</span></Link>
          </div>
          <div className="grid min-h-97.5 grid-cols-[64px_1fr] overflow-hidden rounded-[22px] border border-console-line bg-console text-[#f5f7fa] shadow-reel [&_aside]:flex [&_aside]:flex-col [&_aside]:items-center [&_aside]:gap-3.5 [&_aside]:border-r [&_aside]:border-console-line [&_aside]:pt-4.5 [&_aside>span]:size-7.5 [&_aside>span]:rounded-lg [&_aside>span]:bg-[#1d2633] [&>div]:px-4.5 [&>div]:py-6.5 [&_header]:grid [&_header]:gap-1.25 [&_small]:font-mono [&_small]:text-[.48rem] [&_small]:tracking-[.08em] [&_small]:text-[#8290a3] [&_header_b]:font-display [&_header_b]:text-[1.55rem] [&_section]:mt-6.5 [&_section]:grid [&_section]:grid-cols-3 [&_section]:gap-2 [&_article]:grid [&_article]:gap-3.25 [&_article]:rounded-[10px] [&_article]:border [&_article]:border-[#273040] [&_article]:bg-[#121822] [&_article]:px-2.5 [&_article]:py-3.5 [&_article_strong]:text-[1.3rem]">
            <aside><Brand compact /><span /><span /><span /></aside>
            <div><header><small>SELAMAT MALAM</small><b>Arsip tontonanmu</b></header><section><article><small>Total ditonton</small><strong>128</strong></article><article><small>Film</small><strong>86</strong></article><article><small>Serial</small><strong>42</strong></article></section><div className="mt-4 grid grid-cols-[50px_1fr_auto] items-center gap-2.75 rounded-xl bg-[#171e29] p-3.25 [&_i]:h-17.5 [&_i]:w-12.5 [&_i]:rounded-[7px] [&_i]:bg-[linear-gradient(145deg,#6d8cff,#202b46)] [&_p]:grid [&_p]:gap-1.5 [&_p_strong]:text-[.78rem] [&>span]:font-mono [&>span]:text-[.65rem] [&>span]:text-watched-mint"><i /><p><small>TERAKHIR DITONTON</small><strong>Dune: Part Two</strong></p><span>100%</span></div></div>
          </div>
        </section>

        <section className="grid max-w-none gap-9 bg-console px-[max(18px,calc((100vw-1280px)/2))] py-24 text-[#f5f7fa] [&>div]:max-w-162.5 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[clamp(2.35rem,7vw,4.6rem)] [&_h2]:leading-[.97] [&_h2]:tracking-[-.06em] [&_p]:mt-5 [&_p]:text-[.82rem] [&_p]:leading-[1.65] [&_p]:text-[#a6b0bf] [&_ul]:grid [&_ul]:list-none [&_ul]:gap-3 [&_ul]:p-0 [&_li]:flex [&_li]:items-center [&_li]:gap-2.5 [&_li]:rounded-xl [&_li]:border [&_li]:border-[#273040] [&_li]:bg-[#121822] [&_li]:p-3.75 [&_li]:text-[.75rem] [&_li_svg]:text-watched-mint min-[768px]:grid-cols-[1.3fr_.7fr] min-[768px]:items-center" id="privasi">
          <div><span className="inline-block rounded-[7px] border border-[#2d394a] px-2.25 py-1.75 font-mono text-[.52rem] tracking-[.09em] text-watched-mint">PRIVATE BY DEFAULT</span><h2>Riwayatmu bukan umpan iklan.</h2><p>Reelmark hanya mencatat informasi yang dibutuhkan untuk mengingat tontonan. Extension menyimpan antrean lokal dan baru menyinkronkannya setelah kamu memasangkan browser.</p></div>
          <ul><li><CheckIcon size={18} /> Tidak membaca isi halaman lain</li><li><CheckIcon size={18} /> Tidak menjual data tontonan</li><li><CheckIcon size={18} /> Kontrol situs ada di tanganmu</li></ul>
        </section>

        <section className="mx-auto grid max-w-320 gap-10 px-4.5 py-24 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[clamp(2.35rem,7vw,4.6rem)] [&_h2]:leading-[.97] [&_h2]:tracking-[-.06em] [&_details]:border-b [&_details]:border-line [&_summary]:flex [&_summary]:min-h-17 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-5 [&_summary]:font-[750] [&_summary]:after:text-[1.3rem] [&_summary]:after:text-reel-blue [&_summary]:after:content-['+'] [&_details[open]_summary]:after:content-['−'] [&_details_p]:mb-5 [&_details_p]:max-w-175 [&_details_p]:text-[.82rem] [&_details_p]:leading-[1.6] [&_details_p]:text-muted min-[768px]:grid-cols-[.65fr_1.35fr] min-[1200px]:py-32.5">
          <div className="max-w-172.5 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[clamp(2.35rem,7vw,4.6rem)] [&_h2]:leading-[.97] [&_h2]:tracking-[-.06em]"><p className="font-mono text-[.64rem] font-bold tracking-[.13em] text-reel-blue [&_span]:mr-2 [&_span]:inline-block [&_span]:size-1.75 [&_span]:rounded-full [&_span]:bg-live-coral [&_span]:shadow-[0_0_0_5px_rgb(255_107_99/12%)]">FAQ</p><h2>Sebelum mulai.</h2></div>
          <div>
            <details><summary>Apakah extension sudah tersedia di Chrome Web Store?</summary><p>Belum. Versi ini adalah beta yang dipasang melalui Developer mode di Chrome atau Edge.</p></details>
            <details><summary>Kapan sebuah judul dianggap sudah ditonton?</summary><p>Default-nya saat posisi mencapai 80%. Setelah masuk, kamu dapat mengaturnya antara 50–100% melalui Pengaturan.</p></details>
            <details><summary>Apakah extension sudah tersinkron ke dashboard?</summary><p>Sudah untuk versi lokal. Buat kode di Dashboard → Extension, lalu masukkan kode itu pada popup extension.</p></details>
          </div>
        </section>

        <section className="mx-3 mb-16 rounded-3xl bg-reel-blue-strong px-5 py-15.5 text-center text-[#f5f7fa] [&>p]:font-mono [&>p]:text-[.57rem] [&>p]:tracking-[.12em] [&_h2]:my-3.5 [&_h2]:mb-7 [&_h2]:font-display [&_h2]:text-[clamp(2.45rem,8vw,5rem)] [&_h2]:leading-[.92] [&_h2]:tracking-[-.065em] [&>div]:flex [&>div]:flex-wrap [&>div]:justify-center [&>div]:gap-2.5 min-[768px]:mx-8 min-[768px]:px-7.5 min-[768px]:py-21.5 min-[1200px]:mx-16">
          <p>REELMARK / MEMORY ON</p><h2>Tak perlu bertanya,<br />“pernah nonton belum?”</h2>
          <div><Link className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-watched-mint px-4.5 text-[.78rem] font-extrabold text-[#071019] hover:bg-[#75e4ba] [&_span]:text-base" href={primaryHref}>{user ? "Buka dashboard" : "Buat arsipmu"} <span>→</span></Link><Link className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/35 bg-transparent px-4.5 text-[.78rem] font-extrabold text-white hover:border-white disabled:cursor-wait disabled:opacity-65" href="/extension">Pelajari extension beta</Link></div>
        </section>
      </main>

      <footer className="grid gap-4.5 border-t border-line bg-surface px-4.5 pt-8 pb-12 [&_p]:font-mono [&_p]:text-[.52rem] [&_p]:leading-[1.6] [&_p]:text-muted [&>span]:font-mono [&>span]:text-[.52rem] [&>span]:leading-[1.6] [&>span]:text-muted min-[768px]:grid-cols-[1fr_2fr_auto] min-[768px]:items-center min-[768px]:px-10 min-[768px]:[&_p]:text-center"><Brand /><p>Data film oleh TMDB. Reelmark tidak didukung atau disertifikasi oleh TMDB.</p><span>© 2026 · JKT</span></footer>
    </div>
  );
}
