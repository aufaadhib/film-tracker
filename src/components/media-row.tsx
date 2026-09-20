import Image from "next/image";
import { CorrectTitleButton } from "@/components/correct-title-button";
import { DeleteWatchedButton } from "@/components/delete-watched-button";
import { FilmIcon } from "@/components/icons";
import { formatDisplayTitle, formatEpisodeDisplayTitle, type WatchedTitle } from "@/lib/catalog";

type RowSelection = {
  checked: boolean;
  onChange: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const providerLabels: Record<string, string> = { netflix: "NETFLIX", disney: "DISNEY+", prime_video: "PRIME VIDEO", max: "MAX" };

export function MediaRow({ item, selection }: { item: WatchedTitle; selection?: RowSelection }) {
  const mediaKind = item.episodeNumber ? "EPISODE" : item.mediaType === "movie" ? "FILM" : "SERIAL";
  const title = formatEpisodeDisplayTitle(
    formatDisplayTitle(item.title, item.originalTitle),
    item.seasonNumber,
    item.episodeNumber,
    item.episodeTitle,
  );
  const isOngoing = item.seriesStatus === "ongoing";
  return (
    <article className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3.25 min-[620px]:grid-cols-[58px_minmax(0,1fr)_auto] min-[620px]:gap-4 ${selection ? "grid-cols-[36px_48px_minmax(0,1fr)_auto] min-[620px]:grid-cols-[40px_58px_minmax(0,1fr)_auto] max-[560px]:grid-cols-[36px_48px_minmax(0,1fr)]" : ""}`}>
      {selection && (
        <label className="grid min-h-11 w-9 cursor-pointer place-items-center [&_input]:m-0 [&_input]:size-4.5 [&_input]:cursor-pointer [&_input]:accent-reel-blue">
          <input type="checkbox" checked={selection.checked} onChange={selection.onChange} />
          <span className="sr-only">Pilih {title}</span>
        </label>
      )}
      <div className="relative grid h-16.5 w-12 place-items-center overflow-hidden rounded-lg bg-surface-soft text-reel-blue [&_img]:object-cover min-[620px]:h-20 min-[620px]:w-14.5">
        {item.posterPath ? <Image src={`https://image.tmdb.org/t/p/w154${item.posterPath}`} alt="" fill sizes="58px" /> : <FilmIcon size={23} />}
      </div>
      <div className="min-w-0 [&>p]:mb-1.25 [&>p]:flex [&>p]:flex-wrap [&>p]:items-center [&>p]:gap-1.25 [&>p]:font-mono [&>p]:text-[.47rem] [&>p]:tracking-[.07em] [&>p]:text-reel-blue [&>h3]:mb-1.5 [&>h3]:overflow-hidden [&>h3]:text-ellipsis [&>h3]:whitespace-nowrap [&>h3]:font-display [&>h3]:text-[.94rem] [&>h3]:tracking-tight [&>span]:text-[.61rem] [&>span]:text-muted">
        <p>
          <span>{item.matched ? `${mediaKind} · ${item.year ?? "—"}` : `${item.provider ? providerLabels[item.provider] ?? item.provider.toLocaleUpperCase("id-ID") : "PLATFORM"} · BELUM COCOK`}</span>
          {isOngoing && <span className="m-0 rounded-[5px] bg-ongoing-bg px-1.25 py-0.5 text-[.42rem] font-bold tracking-[.035em] text-ongoing-text">MASIH TAYANG</span>}
        </p>
        <h3>{title}</h3>
        <span>{dateFormatter.format(new Date(item.watchedAt))}</span>
      </div>
      <div className={`flex items-center justify-end gap-2.25 max-[480px]:flex-col max-[480px]:items-end ${selection ? "max-[560px]:col-[2/-1] max-[560px]:flex-row max-[560px]:items-center" : ""}`}>
        {item.matched && <div className="grid justify-items-end gap-0.5 [&_strong]:font-mono [&_strong]:text-[.68rem] [&_strong]:tabular-nums [&_span]:text-[.53rem] [&_span]:text-muted"><strong>{item.watchCount}×</strong><span>ditonton</span></div>}
        {item.matched ? <span className="hidden rounded-[7px] bg-watched-mint px-2 py-1.5 font-mono text-[.46rem] font-bold tracking-wider text-[#0b3324] min-[620px]:inline-block">SELESAI</span> : <CorrectTitleButton sessionId={item.id} detectedTitle={item.title} />}
        <DeleteWatchedButton itemId={item.id} matched={item.matched} title={title} episode={item.episodeNumber != null} />
      </div>
    </article>
  );
}
