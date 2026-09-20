"use client";

import Image from "next/image";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { deleteWatchedItems, type BulkDeleteWatchedState } from "@/app/dashboard/actions";
import { DeleteWatchedButton } from "@/components/delete-watched-button";
import { CheckIcon, FilmIcon, TrashIcon } from "@/components/icons";
import { MediaRow } from "@/components/media-row";
import { confirmDelete } from "@/components/sweetalert";
import { formatDisplayTitle, groupWatchedTitles, type WatchedTitle } from "@/lib/catalog";

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
    <label className="grid min-h-11 w-9 shrink-0 cursor-pointer place-items-center [&_input]:m-0 [&_input]:size-4.5 [&_input]:cursor-pointer [&_input]:accent-reel-blue">
      <input ref={inputRef} type="checkbox" checked={checked} onChange={onChange} />
      <span className="sr-only">{label}</span>
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
    <article className="min-w-0 border-b border-line py-4">
      <header className={`grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3.5 min-[640px]:grid-cols-[82px_minmax(0,1fr)_auto] min-[640px]:gap-4.5 max-[420px]:items-start ${selection ? "grid-cols-[36px_64px_minmax(0,1fr)] gap-2.5 min-[640px]:grid-cols-[40px_82px_minmax(0,1fr)_auto] min-[640px]:gap-3.5" : ""}`}>
        {selection && (
          <SelectionCheckbox
            checked={selectedEpisodes === seriesKeys.length}
            mixed={selectedEpisodes > 0 && selectedEpisodes < seriesKeys.length}
            label={`Pilih semua episode ${title}`}
            onChange={() => selection.toggle(seriesKeys)}
          />
        )}
        <div className="relative grid w-16 aspect-[2/3] place-items-center overflow-hidden rounded-[10px] bg-surface-soft text-reel-blue [&_img]:object-cover min-[640px]:w-20.5">
          {series.posterPath
            ? <Image src={`https://image.tmdb.org/t/p/w342${series.posterPath}`} alt="" fill sizes="(max-width: 639px) 64px, 82px" />
            : <FilmIcon size={28} />}
        </div>
        <div className="min-w-0 [&>p]:mb-1.25 [&>p]:font-mono [&>p]:text-[.5rem] [&>p]:font-bold [&>p]:tracking-[.08em] [&>p]:text-reel-blue [&_h3]:text-balance [&_h3]:font-display [&_h3]:text-[1.1rem] [&_h3]:leading-[1.15] [&_h3]:tracking-[-.035em] min-[640px]:[&_h3]:text-xl [&>span]:mt-1.75 [&>span]:block [&>span]:text-[.61rem] [&>span]:text-muted">
          <p>SERIAL · {series.year ?? "TAHUN TIDAK DIKETAHUI"}</p>
          <h3>{title}</h3>
          <span>{items.length} episode selesai · {seasons.size} season</span>
          <div className="mt-2.25 flex flex-wrap items-center gap-1.5">
            {isOngoing && <span className="inline-flex items-center gap-1 rounded-[5px] bg-ongoing-bg px-1.25 py-0.75 font-mono text-[.44rem] font-bold tracking-[.04em] text-ongoing-text">MASIH TAYANG</span>}
            <span className="inline-flex items-center gap-1 rounded-[5px] bg-surface-soft px-1.25 py-0.75 font-mono text-[.44rem] font-bold tracking-[.04em] text-ink-soft"><CheckIcon size={15} /> TERSINKRON</span>
          </div>
        </div>
      </header>

      <div className="mt-3.5 grid gap-2 min-[640px]:ml-25 [&_details]:overflow-hidden [&_details]:rounded-xl [&_details]:border [&_details]:border-line [&_details]:bg-surface-soft [&_summary]:grid [&_summary]:min-h-12 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:grid-cols-[minmax(0,1fr)_auto_10px] [&_summary]:items-center [&_summary]:gap-3 [&_summary]:px-3.5 [&_summary]:font-display [&_summary]:text-[.82rem] [&_summary]:font-[750] [&_summary]:hover:bg-[color-mix(in_srgb,var(--reel-blue)_7%,transparent)] [&_summary_small]:font-mono [&_summary_small]:text-[.48rem] [&_summary_small]:font-medium [&_summary_small]:text-muted">
        {sortedSeasons.map(([seasonNumber, episodes], seasonIndex) => {
          const sorted = [...episodes].sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
          return (
            <details key={seasonNumber} open={seasonIndex === 0}>
              <summary>
                <span>Season {seasonNumber}</span>
                <small>{sorted.length} episode</small>
              </summary>
              <div className="border-t border-line">
                {sorted.map((episode) => {
                  const episodeTitle = episode.episodeTitle?.trim() || `Episode ${episode.episodeNumber}`;
                  const deleteTitle = `${title} · S${seasonNumber}:E${episode.episodeNumber}`;
                  return (
                    <div className={`grid min-h-17 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.75 bg-surface px-3 py-2.5 [&+&]:border-t [&+&]:border-line min-[640px]:min-h-18 min-[640px]:grid-cols-[34px_minmax(0,1fr)_auto_auto] min-[640px]:px-3.75 max-[420px]:grid-cols-[24px_minmax(0,1fr)_auto] max-[420px]:gap-2 max-[420px]:px-2.25 ${selection ? "grid-cols-[36px_28px_minmax(0,1fr)_auto] gap-2 min-[640px]:grid-cols-[40px_34px_minmax(0,1fr)_auto_auto] max-[420px]:grid-cols-[32px_24px_minmax(0,1fr)] max-[420px]:[&>:last-child]:col-3 max-[420px]:[&>:last-child]:justify-self-end" : ""}`} key={episode.id}>
                      {selection && (
                        <SelectionCheckbox
                          checked={selection.selected.has(selectionKey(episode))}
                          label={`Pilih ${deleteTitle}`}
                          onChange={() => selection.toggle([selectionKey(episode)])}
                        />
                      )}
                      <strong className="text-center font-mono text-[.72rem] text-muted tabular-nums">{episode.episodeNumber}</strong>
                      <div className="min-w-0 [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>strong]:text-[.73rem] [&>span]:mt-1.25 [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&>span]:text-[.55rem] [&>span]:text-muted max-[420px]:[&>span]:items-start max-[420px]:[&>span]:leading-[1.4] [&_svg]:text-watched-mint">
                        <strong>{episodeTitle}</strong>
                        <span><CheckIcon size={13} /> Selesai · {dateFormatter.format(new Date(episode.watchedAt))}</span>
                      </div>
                      {episode.watchCount > 1 && <span className="hidden whitespace-nowrap font-mono text-[.52rem] text-muted min-[640px]:inline">{episode.watchCount}× ditonton</span>}
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
      <div className={`min-w-0 ${selecting ? "max-[767px]:fixed max-[767px]:right-[max(12px,env(safe-area-inset-right))] max-[767px]:bottom-[calc(82px+env(safe-area-inset-bottom))] max-[767px]:left-[max(12px,env(safe-area-inset-left))] max-[767px]:z-35 max-[767px]:rounded-[14px] max-[767px]:border max-[767px]:border-line-strong max-[767px]:bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] max-[767px]:p-2 max-[767px]:shadow-reel max-[767px]:backdrop-blur-2xl min-[768px]:sticky min-[768px]:top-18 min-[768px]:z-10 min-[768px]:-mx-2 min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-line-strong min-[768px]:bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] min-[768px]:p-2 min-[768px]:shadow-reel min-[768px]:backdrop-blur-2xl [&>div]:border-b-0!" : ""}`}>
        <div className="flex min-h-11 items-center justify-end gap-2 border-b border-line max-[420px]:flex-wrap max-[420px]:items-stretch max-[420px]:py-1.5 [&>span]:mr-auto [&>span]:text-[.62rem] [&>span]:text-muted max-[420px]:[&>span]:flex max-[420px]:[&>span]:min-h-11 max-[420px]:[&>span]:items-center [&_form]:contents max-[420px]:[&_form]:order-3 max-[420px]:[&_form]:block max-[420px]:[&_form]:w-full [&_button]:inline-flex [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:gap-1.5 [&_button]:rounded-lg [&_button]:border [&_button]:border-line [&_button]:px-2.75 [&_button]:text-[.6rem] [&_button]:font-[750] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-48">
          {selecting ? (
            <>
              <SelectionCheckbox checked={allSelected} mixed={selected.size > 0 && !allSelected} label="Pilih semua tontonan di halaman ini" onChange={() => toggle(allKeys)} />
              <span>{selected.size ? `${selected.size} dipilih` : "Pilih tontonan"}</span>
              <form action={action} onSubmit={handleSubmit}>
                {[...selected].map((value) => <input key={value} type="hidden" name="items" value={value} />)}
                <button className="border-[color-mix(in_srgb,#bc3e3a_35%,var(--line))]! bg-[color-mix(in_srgb,#bc3e3a_7%,transparent)] text-[#a33b38] hover:border-[#bc3e3a]! max-[420px]:w-full" type="submit" disabled={!selected.size || isPending}><TrashIcon size={15} /> {isPending ? "Menghapus…" : "Hapus terpilih"}</button>
              </form>
              <button className="bg-transparent text-ink hover:border-reel-blue hover:bg-[color-mix(in_srgb,var(--reel-blue)_7%,transparent)]" type="button" onClick={cancelSelection}>Batal</button>
            </>
          ) : <button className="bg-transparent text-ink hover:border-reel-blue hover:bg-[color-mix(in_srgb,var(--reel-blue)_7%,transparent)]" type="button" onClick={() => setSelecting(true)}>Pilih beberapa</button>}
        </div>
        {state.message && <p className={state.status === "error" ? "mt-2 rounded-lg bg-[color-mix(in_srgb,#bc3e3a_8%,transparent)] px-2.5 py-2 text-[.6rem] leading-[1.45] text-[#a33b38]" : "mt-2 rounded-lg bg-ongoing-bg px-2.5 py-2 text-[.6rem] leading-[1.45] text-ongoing-text"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      </div>
      <div className={`grid min-w-0 ${selecting ? "max-[767px]:pb-24 max-[420px]:pb-39 [&_input[type=checkbox]]:scroll-my-20 min-[768px]:[&_input[type=checkbox]]:scroll-my-33" : ""}`}>
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
