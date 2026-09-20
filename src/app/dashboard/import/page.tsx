import { ImportIcon } from "@/components/icons";

export default function ImportPage() {
  return (
    <div className="min-w-0">
      <header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted"><div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">NETFLIX HISTORY</p><h1>Import riwayat.</h1></div><p>Bawa tontonan lama ke satu arsip Reelmark.</p></header>
      <div className="grid min-h-60 place-items-center content-center gap-2.5 rounded-2xl border border-dashed border-line-strong p-7.5 text-center [&_svg]:text-reel-blue [&_h2]:font-display [&_h2]:text-[1.28rem] [&_h2]:tracking-[-.035em] [&_p]:max-w-107.5 [&_p]:text-[.75rem] [&_p]:leading-[1.55] [&_p]:text-muted [&_a]:mt-2 [&_a]:text-[.72rem] [&_a]:font-extrabold [&_a]:text-reel-blue"><ImportIcon size={30} /><h2>Import CSV segera hadir</h2><p>Alur upload dan pemrosesan belum tersedia. Reelmark tidak akan meminta file sebelum validasi, pencocokan judul, dan penanganan duplikat siap digunakan dengan aman.</p></div>
    </div>
  );
}
