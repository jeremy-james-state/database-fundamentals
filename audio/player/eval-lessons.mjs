#!/usr/bin/env node
/**
 * Catalog completeness for the playlist player.
 *   node audio/player/eval-lessons.mjs
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const EXPECTED = 28;
const MIN_LYRICS = 40;
const MIN_DURATION = 180;
const MIN_AUDIO_BYTES = 400_000;
const MIN_SCENES = 4;
const MIN_SOURCE_RATIO = 0.55;
/** YouTube playlist PL3fg3zQpW0k4UO9eBDLdroADnB18ZAOgj durations (seconds). */
const YT_SECONDS = {
  "relational-databases": 909,
  "filter-and-summarize": 1011,
  "change-a-table": 755,
  "foreign-keys": 957,
  "joins": 909,
  "read-sql": 886,
  "strong-and-weak-entities": 792,
  "design-goals": 458,
  "design-lifecycle": 712,
  "entities-and-attributes": 608,
  "choose-a-key": 781,
  "text-types": 584,
  "number-types": 563,
  "date-types": 318,
  "er-diagrams": 529,
  "one-to-one": 943,
  "one-to-many": 659,
  "many-to-many": 637,
  "first-normal-form": 736,
  "second-normal-form": 856,
  "third-normal-form": 861,
  "boyce-codd": 441,
  "unique-keys": 837,
  "foreign-key-actions": 617,
  "column-constraints": 1109,
  "access-control": 1248,
  "indexes": 720,
  "denormalization": 777,
};
/** Lesson 1 film is owned separately; do not fail it on YouTube ratio. */
const RATIO_EXEMPT = new Set(["relational-databases"]);
const BANNED = /\b(charlie|mbta)\b/i;
const catalog = JSON.parse(readFileSync(join(dir, "media/lessons.json"), "utf8"));
const lessons = catalog.lessons || [];

let fails = 0;
function fail(msg) {
  fails += 1;
  console.log(`FAIL ${msg}`);
}

console.log("Playlist catalog eval\n");
if (lessons.length !== EXPECTED) {
  fail(`catalog count ${lessons.length} !== ${EXPECTED}`);
} else {
  console.log(`OK count ${EXPECTED}`);
}

const ids = new Set();
const summary = [];
for (const lesson of lessons) {
  if (!lesson.id || !lesson.title) fail(`missing id/title`);
  if (ids.has(lesson.id)) fail(`duplicate id ${lesson.id}`);
  ids.add(lesson.id);
  if (BANNED.test(lesson.title || "") || BANNED.test(lesson.id || "")) {
    fail(`${lesson.id} title/id uses a lecture example name`);
  }
  if (!lesson.cues || !lesson.audio) {
    fail(`${lesson.id} missing cues/audio (placeholder)`);
    continue;
  }
  const cuesPath = join(dir, lesson.cues);
  const audioPath = join(dir, lesson.audio);
  if (!existsSync(cuesPath)) fail(`${lesson.id} missing ${lesson.cues}`);
  if (!existsSync(audioPath)) fail(`${lesson.id} missing ${lesson.audio}`);
  if (existsSync(audioPath)) {
    const bytes = statSync(audioPath).size;
    if (bytes < MIN_AUDIO_BYTES) fail(`${lesson.id} audio ${bytes} bytes < ${MIN_AUDIO_BYTES}`);
  }
  if (!existsSync(cuesPath)) continue;
  const cues = JSON.parse(readFileSync(cuesPath, "utf8"));
  const lyrics = cues.lyrics || [];
  const duration = cues.duration || 0;
  if (lyrics.length < MIN_LYRICS) fail(`${lesson.id} only ${lyrics.length} lyrics (min ${MIN_LYRICS})`);
  if (duration < MIN_DURATION) fail(`${lesson.id} duration ${duration}s < ${MIN_DURATION}s`);
  const yt = YT_SECONDS[lesson.id];
  if (yt && !RATIO_EXEMPT.has(lesson.id)) {
    const ratio = duration / yt;
    const minLyrics = Math.max(MIN_LYRICS, Math.round(yt / 12));
    if (ratio < MIN_SOURCE_RATIO) {
      fail(
        `${lesson.id} ${duration.toFixed(0)}s is ${(ratio * 100).toFixed(0)}% of YouTube ${yt}s (min ${Math.round(MIN_SOURCE_RATIO * 100)}%)`
      );
    }
    if (lyrics.length < minLyrics) {
      fail(`${lesson.id} only ${lyrics.length} lyrics (min ${minLyrics} for ${yt}s source)`);
    }
  }
  for (const lyric of lyrics) {
    if (BANNED.test(lyric.text || "")) fail(`${lesson.id} lyric names a lecture example`);
  }
  const scenes = cues.scenes;
  if (lesson.id === "relational-databases") {
    summary.push({ id: lesson.id, lyrics: lyrics.length, duration, scenes: "(stage)" });
    continue;
  }
  if (!Array.isArray(scenes) || scenes.length < MIN_SCENES) {
    fail(`${lesson.id} needs ${MIN_SCENES}+ scenes in cues.json (has ${scenes ? scenes.length : 0})`);
  } else {
    if (scenes[0].fromLyric !== 0) fail(`${lesson.id} scenes start at ${scenes[0].fromLyric}`);
    const last = scenes[scenes.length - 1];
    if (last.toLyric < lyrics.length) {
      fail(`${lesson.id} scenes stop at ${last.toLyric}, lyrics ${lyrics.length}`);
    }
    for (let i = 0; i < lyrics.length; i += 1) {
      const hit = scenes.some((s) => i >= s.fromLyric && i < s.toLyric);
      if (!hit) {
        fail(`${lesson.id} lyric ${i} not covered by scenes`);
        break;
      }
    }
  }
  summary.push({
    id: lesson.id,
    lyrics: lyrics.length,
    duration,
    scenes: Array.isArray(scenes) ? scenes.length : 0,
  });
}

if (!ids.has("relational-databases")) fail("first lesson relational-databases missing");
if (lessons[0]?.id !== "relational-databases") fail("first catalog row must be relational-databases");
if (lessons[0]?.cues !== "media/cues.json") fail("lesson 1 cues path changed");
if (lessons[0]?.audio !== "media/narration.mp3") fail("lesson 1 audio path changed");

console.log("\nid\tlyrics\tduration_s\tyt_s\tratio\tscenes");
for (const row of summary) {
  const dur = typeof row.duration === "number" ? row.duration.toFixed(1) : row.duration;
  const ytv = YT_SECONDS[row.id];
  const ratio = ytv && typeof row.duration === "number" ? `${Math.round((row.duration / ytv) * 100)}%` : "";
  console.log(`${row.id}\t${row.lyrics}\t${dur}\t${ytv || ""}\t${ratio}\t${row.scenes}`);
}

if (!fails) console.log("\nOK — 28 lessons, films not 3× shorter than source, scenes cover lyrics.");
process.exit(fails ? 1 : 0);
