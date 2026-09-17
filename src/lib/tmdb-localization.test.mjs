import assert from "node:assert/strict";
import { mergeLocalizedTitle } from "./tmdb-localization.ts";

const korean = {
  tmdbId: 93846,
  mediaType: "tv",
  title: "더 킹 : 영원의 군주",
  originalTitle: "더 킹 : 영원의 군주",
  year: 2020,
  overview: "Sinopsis belum tersedia.",
  posterPath: "/korean.jpg",
  backdropPath: null,
  voteAverage: 8.2,
};
const english = {
  ...korean,
  title: "The King: Eternal Monarch",
  overview: "A Korean emperor crosses into a parallel world.",
  backdropPath: "/english.jpg",
};

assert.deepEqual(mergeLocalizedTitle(korean, english, "ko"), {
  ...korean,
  title: english.title,
  overview: english.overview,
  backdropPath: english.backdropPath,
});
assert.equal(mergeLocalizedTitle({ ...korean, title: "Judul Indonesia" }, english, "ko").title, "Judul Indonesia");
assert.equal(mergeLocalizedTitle({ ...korean, title: "Hantu Dalam Sel", originalTitle: "Hantu Dalam Sel" }, english, "id").title, "Hantu Dalam Sel");

console.log("TMDB localization tests passed");
