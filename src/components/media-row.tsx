import Image from "next/image";
import { CorrectTitleButton } from "@/components/correct-title-button";
import { DeleteWatchedButton } from "@/components/delete-watched-button";
import { FilmIcon } from "@/components/icons";
import { formatDisplayTitle, type WatchedTitle } from "@/lib/catalog";
import styles from "./media-row.module.css";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const providerLabels: Record<string, string> = { netflix: "NETFLIX", disney: "DISNEY+", prime_video: "PRIME VIDEO", max: "MAX" };

export function MediaRow({ item }: { item: WatchedTitle }) {
  const title = formatDisplayTitle(item.title, item.originalTitle);
  return (
    <article className={styles.row}>
      <div className={styles.poster}>
        {item.posterPath ? <Image src={`https://image.tmdb.org/t/p/w154${item.posterPath}`} alt="" fill sizes="58px" /> : <FilmIcon size={23} />}
      </div>
      <div className={styles.copy}><p>{item.matched ? `${item.mediaType === "movie" ? "FILM" : "SERIAL"} · ${item.year ?? "—"}` : `${item.provider ? providerLabels[item.provider] ?? item.provider.toLocaleUpperCase("id-ID") : "PLATFORM"} · BELUM COCOK`}</p><h3>{title}</h3><span>{dateFormatter.format(new Date(item.watchedAt))}</span></div>
      <div className={styles.actions}>
        {item.matched && <div className={styles.count}><strong>{item.watchCount}×</strong><span>ditonton</span></div>}
        {item.matched ? <span className={styles.status}>SELESAI</span> : <CorrectTitleButton sessionId={item.id} detectedTitle={item.title} />}
        <DeleteWatchedButton itemId={item.id} matched={item.matched} title={title} />
      </div>
    </article>
  );
}
