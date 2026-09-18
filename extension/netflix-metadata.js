(() => {
  function readPlayerMetadata() {
    try {
      const api = globalThis.netflix?.appContext?.state?.playerApp?.getAPI?.();
      const videoPlayer = api?.videoPlayer;
      const requestedVideoId = Number(location.pathname.match(/^\/watch\/(\d+)/)?.[1]);
      const sessions = videoPlayer?.getAllPlayerSessionIds?.() ?? [];
      const players = sessions.map((sessionId) => videoPlayer.getVideoPlayerBySessionId(sessionId));
      const player = players.find((candidate) => candidate?.getMovieId?.() === requestedVideoId) ?? players[0];
      const videoId = Number(player?.getMovieId?.());
      if (!Number.isInteger(videoId)) return;

      const summary = api?.getPlayableDataByVideoId?.(videoId)?.summary;
      if (!summary) return;

      const type = String(summary.type ?? "").toLowerCase();
      const seasonNumber = Number(summary.season);
      const episodeNumber = Number(summary.episode);
      document.documentElement.dataset.reelmarkNetflixMetadata = JSON.stringify({
        videoId,
        type,
        seasonNumber: Number.isInteger(seasonNumber) && seasonNumber >= 0 ? seasonNumber : null,
        episodeNumber: Number.isInteger(episodeNumber) && episodeNumber >= 1 ? episodeNumber : null,
      });
    } catch {
      // Netflix can rebuild its player while navigating; the next scan retries.
    }
  }

  readPlayerMetadata();
  window.setInterval(readPlayerMetadata, 3000);
})();
