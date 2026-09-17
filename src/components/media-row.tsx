import Image from "next/image";
import { DeleteWatchedButton } from "@/components/delete-watched-button";
import { FilmIcon } from "@/components/icons";
import type { WatchedTitle } from "@/lib/catalog";
import styles from "./media-row.module.css";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export function MediaRow({ item }: { item: WatchedTitle }) {
  return (
    <article className={styles.row}>
      <div className={styles.poster}>
        {item.posterPath ? <Image src={`https://image.tmdb.org/t/p/w154${item.posterPath}`} alt="" fill sizes="58px" /> : <FilmIcon size={23} />}
      </div>
      <div className={styles.copy}><p>{item.mediaType === "movie" ? "FILM" : "SERIAL"} · {item.year ?? "—"}</p><h3>{item.title}</h3><span>{dateFormatter.format(new Date(item.watchedAt))}</span></div>
      <div className={styles.actions}>
        <div className={styles.count}><strong>{item.watchCount}×</strong><span>ditonton</span></div>
        <span className={styles.status}>SELESAI</span>
        <DeleteWatchedButton stateId={item.id} title={item.title} />
      </div>
    </article>
  );
}
