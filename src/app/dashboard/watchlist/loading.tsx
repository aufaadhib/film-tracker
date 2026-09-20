
export default function WatchlistLoading() {
  return (
    <div className="min-w-0 animate-pulse motion-reduce:animate-none" aria-label="Memuat watchlist" aria-busy="true">
      <div className="sr-only">Memuat watchlist…</div>

      <header className="mb-6.5 flex items-end justify-between gap-6 max-[620px]:flex-col max-[620px]:items-start" aria-hidden="true">
        <div>
          <span className="block rounded-md bg-surface-soft mb-3 h-2.25 w-26" />
          <span className="block rounded-md bg-surface-soft h-[clamp(34px,6vw,58px)] w-[min(330px,64vw)] rounded-[10px]" />
        </div>
        <div className="grid justify-items-end gap-2.25 max-[620px]:justify-items-start [&_span:first-child]:h-2.5 [&_span:first-child]:w-32 [&_span:last-child]:h-3 [&_span:last-child]:w-36 [&_span]:block [&_span]:rounded-md [&_span]:bg-surface-soft"><span /><span /></div>
      </header>

      <div className="mb-4 grid gap-2.25 rounded-[14px] border border-line bg-surface p-3.5 min-[640px]:grid-cols-[minmax(180px,1fr)_140px_160px_82px] [&_span]:block [&_span]:h-11 [&_span]:rounded-[9px] [&_span]:border [&_span]:border-line [&_span]:bg-surface-soft" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <section className="grid gap-3 min-[640px]:grid-cols-2 min-[1500px]:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <article className="grid min-w-0 grid-cols-[108px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-surface min-[640px]:grid-cols-[124px_minmax(0,1fr)] min-[1500px]:grid-cols-[138px_minmax(0,1fr)] max-[390px]:grid-cols-[92px_minmax(0,1fr)] [&_h2]:my-1.5 [&_h2]:mb-1.75 [&_h2]:font-display [&_h2]:text-[1.1rem] [&_h2]:leading-[1.15] [&_h2]:tracking-[-.03em]" key={index}>
            <div className="block min-h-41 rounded-none bg-[color-mix(in_srgb,var(--reel-blue-strong)_18%,var(--surface-soft))] min-[640px]:min-h-49 max-[390px]:min-h-35.5" />
            <div className="flex min-w-0 flex-col p-3.5">
              <div className="flex items-center gap-2 [&_span]:block [&_span]:rounded-md [&_span]:bg-surface-soft [&_span:first-child]:h-2 [&_span:first-child]:w-10.5 [&_span:last-child]:h-4.5 [&_span:last-child]:w-16.5"><span /><span /></div>
              <span className="block rounded-md bg-surface-soft my-2 h-4.5 w-[min(210px,78%)]" />
              <span className="block rounded-md bg-surface-soft h-4 w-29.5" />
              <div className="my-2.75 mb-3.25 grid gap-1.5 max-[390px]:hidden [&_span]:block [&_span]:h-1.75 [&_span]:w-full [&_span]:rounded-md [&_span]:bg-surface-soft [&_span:last-child]:w-[72%]"><span /><span /></div>
              <div className="mt-auto grid gap-2 border-t border-line pt-2.5 [&>span]:block [&>span]:h-2.25 [&>span]:w-28 [&>span]:rounded-md [&>span]:bg-surface-soft [&>div]:flex [&>div]:gap-1.5 [&_i]:block [&_i]:size-8 [&_i]:rounded-lg [&_i]:bg-surface-soft">
                <span />
                <div><i /><i /></div>
              </div>
              <div className="mt-3 flex gap-1.75 [&_span]:block [&_span]:h-11 [&_span]:w-21.5 [&_span]:rounded-lg [&_span]:border [&_span]:border-line [&_span]:bg-surface-soft"><span /><span /></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
