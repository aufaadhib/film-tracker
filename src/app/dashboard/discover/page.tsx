import { CatalogSearch } from "@/components/catalog-search";

export default function DiscoverPage() {
  return <div className="min-w-0"><header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted"><div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">TMDB CATALOG</p><h1>Temukan satu judul.</h1></div><p>Cari film atau serial, lalu catat sebagai sudah ditonton atau simpan untuk nanti.</p></header><CatalogSearch /></div>;
}
