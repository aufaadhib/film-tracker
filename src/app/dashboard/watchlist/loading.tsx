import styles from "./watchlist.module.css";

export default function WatchlistLoading() {
  return (
    <div className={`${styles.page} ${styles.loadingPage}`} aria-label="Memuat watchlist" aria-busy="true">
      <div className="sr-only">Memuat watchlist…</div>

      <header className={styles.loadingHeader} aria-hidden="true">
        <div>
          <span className={styles.loadingEyebrow} />
          <span className={styles.loadingTitle} />
        </div>
        <div className={styles.loadingHeaderAside}><span /><span /></div>
      </header>

      <div className={styles.loadingFilters} aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <section className={styles.grid} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <article className={styles.card} key={index}>
            <div className={styles.loadingPoster} />
            <div className={styles.loadingCardBody}>
              <div className={styles.loadingMeta}><span /><span /></div>
              <span className={styles.loadingCardTitle} />
              <span className={styles.loadingRelease} />
              <div className={styles.loadingOverview}><span /><span /></div>
              <div className={styles.loadingProvider}>
                <span />
                <div><i /><i /></div>
              </div>
              <div className={styles.loadingActions}><span /><span /></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
