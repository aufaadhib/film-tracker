"use client";

import Image from "next/image";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { deleteWatchedItems, type BulkDeleteWatchedState } from "@/app/dashboard/actions";
import { DeleteWatchedButton } from "@/components/delete-watched-button";
import { CheckIcon, FilmIcon, TrashIcon } from "@/components/icons";
import { MediaRow } from "@/components/media-row";
import { confirmDelete } from "@/components/sweetalert";
import { formatDisplayTitle, groupWatchedTitles, type WatchedTitle } from "@/lib/catalog";
import styles from "./watch-archive.module.css";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

type SelectionProps = {
  selected: Set<string>;
  toggle: (keys: string[]) => void;
};

const initialState: BulkDeleteWatchedState = { status: "idle", message: "" };
const selectionKey = (item: WatchedTitle) => `${item.matched ? "matched" : "unmatched"}:${item.id}`;

function SelectionCheckbox({ checked, mixed = false, label, onChange }: { checked: boolean; mixed?: boolean; label: string; onChange: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <label className={styles.selection}>
      <input ref={inputRef} type="checkbox" checked={checked} onChange={onChange} />
      <span className={styles.srOnly}>{label}</span>
    </label>
  );
}

function SeriesGroup({ items, selection }: { items: WatchedTitle[]; selection?: SelectionProps }) {
  const series = items[0];
  const title = formatDisplayTitle(series.title, series.originalTitle);
  const seasons = new Map<number, WatchedTitle[]>();
  for (const item of items) {
    const season = item.seasonNumber ?? 0;
    seasons.set(season, [...(seasons.get(season) ?? []), item]);
  }
  const sortedSeasons = [...seasons.entries()].sort(([a], [b]) => b - a);
  const isOngoing = series.seriesStatus === "ongoing";
  const seriesKeys = items.map(selectionKey);
  const selectedEpisodes = seriesKeys.filter((key) => selection?.selected.has(key)).length;

  return (
    <article className={styles.series}>
      <header className={`${styles.seriesHeader} ${selection ? styles.seriesHeaderSelectable : ""}`}>
        {selection && (
          <SelectionCheckbox
            checked={selectedEpisodes === seriesKeys.length}
            mixed={selectedEpisodes > 0 && selectedEpisodes < seriesKeys.length}
            label={`Pilih semua episode ${title}`}
            onChange={() => selection.toggle(seriesKeys)}
          />
        )}
        <div className={styles.poster}>
          {series.posterPath
            ? <Image src={`https://image.tmdb.org/t/p/w342${series.posterPath}`} alt="" fill sizes="(max-width: 639px) 64px, 82px" />
            : <FilmIcon size={28} />}
        </div>
        <div className={styles.seriesCopy}>
          <p>SERIAL · {series.year ?? "TAHUN TIDAK DIKETAHUI"}</p>
          <h3>{title}</h3>
          <span>{items.length} episode selesai · {seasons.size} season</span>
          <div className={styles.seriesBadges}>
            {isOngoing && <span className={styles.releaseStatus}>MASIH TAYANG</span>}
            <span className={styles.seriesStatus}><CheckIcon size={15} /> TERSINKRON</span>
          </div>
        </div>
      </header>

      <div className={styles.seasons}>
        {sortedSeasons.map(([seasonNumber, episodes], seasonIndex) => {
          const sorted = [...episodes].sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
          return (
            <details key={seasonNumber} open={seasonIndex === 0}>
              <summary>
                <span>Season {seasonNumber}</span>
                <small>{sorted.length} episode</small>
              </summary>
              <div className={styles.episodes}>
                {sorted.map((episode) => {
                  const episodeTitle = episode.episodeTitle?.trim() || `Episode ${episode.episodeNumber}`;
                  const deleteTitle = `${title} · S${seasonNumber}:E${episode.episodeNumber}`;
                  return (
                    <div className={`${styles.episode} ${selection ? styles.episodeSelectable : ""}`} key={episode.id}>
                      {selection && (
                        <SelectionCheckbox
                          checked={selection.selected.has(selectionKey(episode))}
                          label={`Pilih ${deleteTitle}`}
                          onChange={() => selection.toggle([selectionKey(episode)])}
                        />
                      )}
                      <strong className={styles.episodeNumber}>{episode.episodeNumber}</strong>
                      <div className={styles.episodeCopy}>
                        <strong>{episodeTitle}</strong>
                        <span><CheckIcon size={13} /> Selesai · {dateFormatter.format(new Date(episode.watchedAt))}</span>
                      </div>
                      {episode.watchCount > 1 && <span className={styles.watchCount}>{episode.watchCount}× ditonton</span>}
                      <DeleteWatchedButton itemId={episode.id} matched title={deleteTitle} episode />
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </article>
  );
}

export function WatchArchive({ items }: { items: WatchedTitle[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, isPending] = useActionState(async (previousState: BulkDeleteWatchedState, formData: FormData) => {
    const nextState = await deleteWatchedItems(previousState, formData);
    if (nextState.status === "success") {
      setSelected(new Set());
      setSelecting(false);
    }
    return nextState;
  }, initialState);
  const confirmed = useRef(false);
  const allKeys = useMemo(() => items.map(selectionKey), [items]);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));

  function toggle(keys: string[]) {
    setSelected((current) => {
      const next = new Set(current);
      const remove = keys.every((key) => next.has(key));
      for (const key of keys) {
        if (remove) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function cancelSelection() {
    setSelected(new Set());
    setSelecting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    if (!selected.size || !await confirmDelete(`Hapus ${selected.size} tontonan terpilih dari riwayat?`)) return;
    confirmed.current = true;
    event.currentTarget.requestSubmit();
  }

  const selection = selecting ? { selected, toggle } : undefined;
  return (
    <>
      <div className={`${styles.bulkBarWrap} ${selecting ? styles.bulkBarWrapActive : ""}`}>
        <div className={styles.bulkBar}>
          {selecting ? (
            <>
              <SelectionCheckbox checked={allSelected} mixed={selected.size > 0 && !allSelected} label="Pilih semua tontonan di halaman ini" onChange={() => toggle(allKeys)} />
              <span>{selected.size ? `${selected.size} dipilih` : "Pilih tontonan"}</span>
              <form action={action} onSubmit={handleSubmit}>
                {[...selected].map((value) => <input key={value} type="hidden" name="items" value={value} />)}
                <button className={styles.bulkDelete} type="submit" disabled={!selected.size || isPending}><TrashIcon size={15} /> {isPending ? "Menghapus…" : "Hapus terpilih"}</button>
              </form>
              <button className={styles.cancel} type="button" onClick={cancelSelection}>Batal</button>
            </>
          ) : <button className={styles.selectButton} type="button" onClick={() => setSelecting(true)}>Pilih beberapa</button>}
        </div>
        {state.message && <p className={state.status === "error" ? styles.bulkError : styles.bulkSuccess} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      </div>
      <div className={`${styles.archive} ${selecting ? styles.archiveSelecting : ""}`}>
        {groupWatchedTitles(items).map((entry) => entry.kind === "series"
          ? <SeriesGroup key={entry.key} items={entry.items} selection={selection} />
          : <MediaRow
              key={entry.item.id}
              item={entry.item}
              selection={selection ? { checked: selected.has(selectionKey(entry.item)), onChange: () => toggle([selectionKey(entry.item)]) } : undefined}
            />)}
      </div>
    </>
  );
}
