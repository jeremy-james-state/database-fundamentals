import { createVisualController } from "./visual-render.js?v=91";
import { buildChapters, setScenes } from "./visual-stage.js?v=91";

const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const speedBtn = document.getElementById("speedBtn");
const backBtn = document.getElementById("backBtn");
const fwdBtn = document.getElementById("fwdBtn");
const scrub = document.getElementById("scrub");
const scrubFill = document.getElementById("scrubFill");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const topEl = document.getElementById("top");
const transport = document.getElementById("transport");
const transportToggle = document.getElementById("transportToggle");
const lyricsEl = document.getElementById("lyrics");
const lyricsViewport = document.getElementById("lyricsViewport");
const stageEl = document.getElementById("stage");
const filmstripEl = document.getElementById("filmstrip");
const filmstripToggle = document.getElementById("filmstripToggle");
const lyricsToggle = document.getElementById("lyricsToggle");
const playlistEl = document.getElementById("playlist");
const playlistToggle = document.getElementById("playlistToggle");
const playlistPrev = document.getElementById("playlistPrev");
const playlistNext = document.getElementById("playlistNext");
const playlistPeek = document.getElementById("playlistPeek");
const collectionTitleEl = document.getElementById("collectionTitle");
const nowDurationEl = document.getElementById("nowDuration");
const slideEl = document.getElementById("slide");
const visualStage = document.getElementById("visualStage");
const titleEl = document.getElementById("title");
const visual = createVisualController(visualStage, slideEl);
const FILMSTRIP_PREF_KEY = "df-player-filmstrip-hidden";
const LYRICS_PREF_KEY = "df-player-lyrics-mode";
const PLAYLIST_PREF_KEY = "df-player-lessons-min";
const COMPLETE_KEY = "df-player-completed";
const SPEED_PREF_KEY = "df-player-playback-rate";
const ASSET_V = "91";
const LYRICS_MODES = ["expanded", "hidden"];

const SPEED_RATES = [0.75, 1, 1.25, 1.5, 2];
let speedIndex = 1;

function storedSpeedIndex() {
  try {
    const idx = SPEED_RATES.indexOf(Number(localStorage.getItem(SPEED_PREF_KEY)));
    if (idx >= 0) return idx;
  } catch {
    /* ignore */
  }
  return 1;
}

let lyrics = [];
let slides = [];
let chapters = [];
let activeIndex = -1;
let activeChapterId = "";
let activeSlideSrc = "";
let scrubbing = false;
let rafId = 0;
let slideTimer = 0;
let userScrolling = false;
let userScrollTimer = 0;
let catalog = { title: "Database fundamentals", lessons: [] };
let currentLesson = null;

function formatRate(rate) {
  return `${rate}×`;
}

function setPlaybackRate(rate) {
  const idx = SPEED_RATES.indexOf(rate);
  if (idx >= 0) speedIndex = idx;
  audio.playbackRate = rate;
  speedBtn.textContent = formatRate(rate);
  speedBtn.dataset.rate = String(rate);
  speedBtn.setAttribute("aria-label", `Playback speed ${formatRate(rate)}`);
  try {
    localStorage.setItem(SPEED_PREF_KEY, String(rate));
  } catch {
    /* ignore */
  }
}

function applyStoredPlaybackRate() {
  const rate = SPEED_RATES[speedIndex] ?? 1;
  audio.playbackRate = rate;
}

function cycleSpeed() {
  speedIndex = (speedIndex + 1) % SPEED_RATES.length;
  setPlaybackRate(SPEED_RATES[speedIndex]);
}

function fmt(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function indexAt(time) {
  if (!lyrics.length) return -1;
  let idx = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].start <= time) idx = i;
    else break;
  }
  return idx;
}

function slideAt(time) {
  if (!slides.length) return "";
  let src = slides[0].src;
  for (const item of slides) {
    if (item.start <= time) src = item.src;
    else break;
  }
  return src;
}

function setSlide(src) {
  if (!src || activeSlideSrc === src) return;
  activeSlideSrc = src;
  window.clearTimeout(slideTimer);
  slideEl.classList.add("is-changing");
  slideTimer = window.setTimeout(() => {
    slideEl.src = `media/${src}`;
    slideEl.dataset.src = src;
    slideEl.classList.remove("is-changing");
  }, 120);
}

function scrollActiveIntoView(index, force = false) {
  if (userScrolling && !force) return;
  const node = lyricsEl.children[index];
  if (!node || !lyricsViewport) return;
  const nodeTop = node.offsetTop;
  const nodeH = node.offsetHeight;
  const viewH = lyricsViewport.clientHeight;
  if (viewH < 8) return;
  const target = nodeTop - viewH / 2 + nodeH / 2;
  lyricsViewport.scrollTo({
    top: Math.max(0, target),
    behavior: force ? "auto" : "smooth",
  });
}

function markUserScrolling() {
  userScrolling = true;
  window.clearTimeout(userScrollTimer);
  userScrollTimer = window.setTimeout(() => {
    userScrolling = false;
    if (activeIndex >= 0) scrollActiveIntoView(activeIndex);
  }, 2200);
}

function thumbMarkup(kind) {
  switch (kind) {
    case "table":
    case "chaos":
      return `<span class="ft-grid" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
    case "schema":
      return `<span class="ft-schema" aria-hidden="true"><i></i><i></i><i></i></span>`;
    case "map":
    case "roadmap":
      return `<span class="ft-map" aria-hidden="true"><i></i><i></i><i></i></span>`;
    case "one-table":
      return `<span class="ft-one" aria-hidden="true"></span>`;
    case "entity-chips":
      return `<span class="ft-chips" aria-hidden="true"><i></i><i></i></span>`;
    case "product-teach":
      return `<span class="ft-teach" aria-hidden="true"><i></i><i></i><i></i></span>`;
    case "bad-grid":
      return `<span class="ft-bad" aria-hidden="true"><i></i><i></i></span>`;
    case "rdbms":
      return `<span class="ft-cyl" aria-hidden="true"></span>`;
    case "sql":
      return `<span class="ft-sql" aria-hidden="true"><i></i><i></i><i></i></span>`;
    default:
      return `<span class="ft-dot" aria-hidden="true"></span>`;
  }
}

function renderFilmstrip() {
  if (!filmstripEl) return;
  filmstripEl.innerHTML = "";
  chapters.forEach((ch) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filmstrip-item";
    btn.dataset.chapter = ch.id;
    btn.dataset.kind = ch.kind;
    btn.setAttribute("aria-label", `${ch.label}, ${fmt(ch.start)}`);
    btn.title = `${ch.label} · ${fmt(ch.start)}`;
    btn.innerHTML = `
      <span class="filmstrip-thumb" data-kind="${ch.kind}">${thumbMarkup(ch.kind)}</span>
      <span class="filmstrip-meta">
        <span class="filmstrip-label">${ch.label}</span>
        <span class="filmstrip-time">${fmt(ch.start)}</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      audio.currentTime = Math.max(0, ch.start + 0.01);
      if (audio.paused) void audio.play();
      update(true);
    });
    filmstripEl.appendChild(btn);
  });
}

function chapterAtLyric(lyricIndex) {
  if (!chapters.length) return null;
  let current = chapters[0];
  for (const ch of chapters) {
    if (lyricIndex >= ch.fromLyric) current = ch;
    else break;
  }
  return current;
}

function syncFilmstrip(lyricIndex) {
  if (!filmstripEl || !chapters.length) return;
  const ch = chapterAtLyric(lyricIndex);
  const id = ch ? ch.id : "";
  if (id === activeChapterId) return;
  activeChapterId = id;
  [...filmstripEl.children].forEach((node) => {
    const on = node.dataset.chapter === id;
    node.classList.toggle("is-active", on);
    if (on) node.setAttribute("aria-current", "true");
    else node.removeAttribute("aria-current");
  });
  const active = filmstripEl.querySelector(".filmstrip-item.is-active");
  if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function renderLyrics() {
  lyricsEl.innerHTML = "";
  lyrics.forEach((line, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lyric";
    btn.textContent = line.text;
    btn.dataset.index = String(i);
    btn.addEventListener("click", () => {
      audio.currentTime = Math.max(0, line.start + 0.01);
      if (audio.paused) void audio.play();
      update(true);
    });
    lyricsEl.appendChild(btn);
  });
}

function setTransportMinimized(minimized) {
  transport.classList.toggle("is-minimized", minimized);
  transportToggle.setAttribute("aria-expanded", String(!minimized));
  transportToggle.setAttribute("aria-label", minimized ? "Show scrubber" : "Hide scrubber");
  transportToggle.title = minimized ? "Show scrubber" : "Hide scrubber";
}

function setFilmstripHidden(hidden) {
  if (!stageEl || !filmstripToggle) return;
  stageEl.classList.toggle("is-filmstrip-hidden", hidden);
  filmstripToggle.setAttribute("aria-expanded", String(!hidden));
  filmstripToggle.setAttribute("aria-label", hidden ? "Show chapters" : "Hide chapters");
  filmstripToggle.title = hidden ? "Show chapters" : "Hide chapters";
  try {
    localStorage.setItem(FILMSTRIP_PREF_KEY, hidden ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

function lyricsMode() {
  if (!stageEl) return "expanded";
  if (stageEl.classList.contains("is-lyrics-hidden")) return "hidden";
  if (stageEl.classList.contains("is-lyrics-compact")) return "compact";
  return "expanded";
}

function setLyricsMode(mode) {
  if (!stageEl || !lyricsToggle) return;
  const next = LYRICS_MODES.includes(mode) ? mode : "expanded";
  stageEl.classList.toggle("is-lyrics-compact", next === "compact");
  stageEl.classList.toggle("is-lyrics-hidden", next === "hidden");
  lyricsToggle.setAttribute("aria-expanded", String(next === "expanded"));
  const label = next === "hidden" ? "Show lyrics" : "Hide lyrics";
  lyricsToggle.setAttribute("aria-label", label);
  lyricsToggle.title = label;
  try {
    localStorage.setItem(LYRICS_PREF_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
  if (next !== "hidden") {
    const recenter = () => {
      if (activeIndex >= 0) scrollActiveIntoView(activeIndex, true);
    };
    requestAnimationFrame(() => requestAnimationFrame(recenter));
    window.setTimeout(recenter, 240);
  }
}

function cycleLyricsMode() {
  const i = LYRICS_MODES.indexOf(lyricsMode());
  setLyricsMode(LYRICS_MODES[(i + 1) % LYRICS_MODES.length]);
}

function restoreLyricsMode() {
  let stored = null;
  try {
    stored = localStorage.getItem(LYRICS_PREF_KEY);
    if (!stored && localStorage.getItem("df-player-lyrics-compact") === "1") {
      stored = "compact";
    }
  } catch {
    stored = null;
  }
  if (stored === "1" || stored === "compact") stored = "expanded";
  if (LYRICS_MODES.includes(stored)) setLyricsMode(stored);
}

function loadCompleted() {
  try {
    const raw = JSON.parse(localStorage.getItem(COMPLETE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function saveCompleted(map) {
  try {
    localStorage.setItem(COMPLETE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function isLessonComplete(id) {
  return Boolean(loadCompleted()[id]);
}

function setLessonComplete(id, done) {
  const map = loadCompleted();
  if (done) map[id] = true;
  else delete map[id];
  saveCompleted(map);
}

function nextIncompleteLesson() {
  const list = catalog.lessons || [];
  const cur = currentLesson ? list.findIndex((lesson) => lesson.id === currentLesson.id) : -1;
  for (let i = cur + 1; i < list.length; i += 1) {
    if (!isLessonComplete(list[i].id)) return list[i];
  }
  for (let i = 0; i < list.length; i += 1) {
    if (!isLessonComplete(list[i].id)) return list[i];
  }
  return currentLesson;
}

function updatePlaylistPeek() {
  if (!playlistPeek) return;
  const lesson = currentLesson;
  const name = lesson?.title || "Lessons";
  const dur = lesson?.duration || "";
  playlistPeek.replaceChildren();
  const title = document.createElement("span");
  title.className = "playlist-peek-title";
  title.textContent = name;
  playlistPeek.append(title);
  if (dur) {
    const time = document.createElement("span");
    time.className = "playlist-peek-dur";
    time.textContent = `· ${dur}`;
    playlistPeek.append(time);
  }
  playlistPeek.setAttribute("aria-label", `Show library, ${name}`);
}

function syncNowPlaying(lesson, heading) {
  if (titleEl) titleEl.textContent = heading || lesson?.title || "";
  if (nowDurationEl) nowDurationEl.textContent = lesson?.duration || "";
  updatePlaylistPeek();
}

function setPlaylistHidden(hidden) {
  if (!topEl || !playlistToggle) return;
  topEl.classList.toggle("is-playlist-hidden", hidden);
  playlistToggle.setAttribute("aria-expanded", String(!hidden));
  playlistToggle.setAttribute("aria-label", hidden ? "Show library" : "Hide library");
  playlistToggle.title = hidden ? "Show library" : "Hide library";
  updatePlaylistPeek();
  try {
    localStorage.setItem(PLAYLIST_PREF_KEY, hidden ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

function lessonFromUrl() {
  const id = new URLSearchParams(location.search).get("lesson");
  return catalog.lessons.find((lesson) => lesson.id === id) || catalog.lessons[0] || null;
}

function renderPlaylist() {
  if (!playlistEl) return;
  playlistEl.innerHTML = "";
  const done = loadCompleted();
  catalog.lessons.forEach((lesson) => {
    const ready = Boolean(lesson.cues && lesson.audio);
    const card = document.createElement("article");
    card.className = "lesson-card";
    card.dataset.id = lesson.id;
    if (currentLesson && lesson.id === currentLesson.id) {
      card.classList.add("is-active");
    }
    if (done[lesson.id]) card.classList.add("is-complete");
    if (!ready) card.classList.add("is-soon");

    const open = document.createElement("button");
    open.type = "button";
    open.className = "lesson-open";
    if (currentLesson && lesson.id === currentLesson.id) {
      open.setAttribute("aria-current", "true");
    }
    open.setAttribute("aria-label", ready ? lesson.title : `${lesson.title}, coming soon`);

    const thumb = document.createElement("span");
    thumb.className = "lesson-thumb";
    thumb.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "lesson-copy";
    const title = document.createElement("span");
    title.className = "lesson-title";
    title.textContent = lesson.title;
    const dur = document.createElement("span");
    dur.className = "lesson-dur";
    dur.textContent = lesson.duration || "";
    copy.append(title, dur);
    open.append(thumb, copy);
    open.addEventListener("click", () => {
      void openLesson(lesson, true);
    });

    const check = document.createElement("button");
    check.type = "button";
    check.className = "lesson-check";
    check.setAttribute("aria-pressed", String(Boolean(done[lesson.id])));
    check.setAttribute("aria-label", done[lesson.id] ? `Mark ${lesson.title} incomplete` : `Mark ${lesson.title} complete`);
    check.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setLessonComplete(lesson.id, !isLessonComplete(lesson.id));
      renderPlaylist();
    });

    card.append(open, check);
    playlistEl.appendChild(card);
  });
  updatePlaylistPeek();
  requestAnimationFrame(() => {
    const focus =
      playlistEl.querySelector(`.lesson-card[data-id="${nextIncompleteLesson()?.id}"]`) ||
      playlistEl.querySelector(".lesson-card.is-active");
    if (focus) focus.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
}

function showComingSoon(lesson) {
  lyrics = [];
  slides = [];
  chapters = [];
  activeIndex = -1;
  activeChapterId = "";
  activeSlideSrc = "";
  renderLyrics();
  renderFilmstrip();
  audio.removeAttribute("src");
  audio.load();
  setScenes(null);
  visual.reset?.();
  currentTimeEl.textContent = fmt(0);
  durationEl.textContent = "—";
  scrub.value = "0";
  scrubFill.style.width = "0%";
  slideEl.removeAttribute("src");
  visualStage.innerHTML = `
    <div class="viz-card is-in viz-soon">
      <p class="viz-soon-kicker">${catalog.title}</p>
      <p>${lesson.title} isn’t recorded yet. Same player, same collection — this slot is waiting on narration.</p>
    </div>
  `;
}

async function applyLesson(lesson) {
  currentLesson = lesson;
  renderPlaylist();
  if (!lesson.cues || !lesson.audio) {
    document.title = `${lesson.title} — synced lesson`;
    syncNowPlaying(lesson);
    showComingSoon(lesson);
    return;
  }
  const data = await fetch(`${lesson.cues}?v=${ASSET_V}`).then((r) => r.json());
  document.title = `${data.title || lesson.title} — synced lesson`;
  syncNowPlaying(lesson, data.title || lesson.title);
  lyrics = data.lyrics || [];
  slides = data.slides || [];
  activeIndex = -1;
  activeChapterId = "";
  if (!slides.length) {
    const seen = new Map();
    for (const line of lyrics) {
      if (line.slide && !seen.has(line.slide)) seen.set(line.slide, line.start);
    }
    slides = [...seen.entries()]
      .map(([src, start]) => ({ src, start }))
      .sort((a, b) => a.start - b.start);
  }
  setScenes(data.scenes);
  visual.reset?.();
  chapters = buildChapters(lyrics);
  renderFilmstrip();
  renderLyrics();
  audio.src = `${lesson.audio}?v=${ASSET_V}`;
  applyStoredPlaybackRate();
  durationEl.textContent = fmt(data.duration || 0);
  update(true);
}

async function openLesson(lesson, push) {
  if (!lesson) return;
  if (currentLesson && lesson.id === currentLesson.id) return;
  if (push) {
    const url = new URL(location.href);
    url.searchParams.set("lesson", lesson.id);
    history.pushState({ lesson: lesson.id }, "", url);
  }
  audio.pause();
  setPlayUi(false);
  await applyLesson(lesson);
}

function seekToLyric(index) {
  const line = lyrics[index];
  if (!line) return;
  audio.currentTime = Math.max(0, line.start + 0.01);
  if (audio.paused) void audio.play();
  update(true);
}

function update(force = false) {
  if (!lyrics.length) return;
  const t = audio.currentTime || 0;
  if (!scrubbing) scrub.value = String(Math.floor(t * 10));
  currentTimeEl.textContent = fmt(t);
  const dur = audio.duration || 0;
  const progressPct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0;
  scrubFill.style.width = `${progressPct}%`;

  setSlide(slideAt(t) || (lyrics[indexAt(t)] || {}).slide || "");

  const idx = indexAt(t);
  visual.sync(t, idx);
  syncFilmstrip(idx);

  if (idx === activeIndex && !force) return;
  activeIndex = idx;

  [...lyricsEl.children].forEach((node, i) => {
    node.classList.toggle("is-active", i === idx);
    node.classList.toggle("is-near", Math.abs(i - idx) === 1);
  });

  if (idx >= 0 && lyricsMode() !== "hidden") scrollActiveIntoView(idx);
}

function setPlayUi(playing) {
  playBtn.classList.toggle("is-playing", playing);
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  playBtn.title = playing ? "Pause" : "Play";
}

async function togglePlay() {
  try {
    if (audio.paused) {
      await audio.play();
      setPlayUi(true);
    } else {
      audio.pause();
      setPlayUi(false);
    }
  } catch (err) {
    console.error("Audio playback failed:", err);
    setPlayUi(false);
  }
}

playBtn.addEventListener("click", () => {
  void togglePlay();
});
speedBtn.addEventListener("click", cycleSpeed);
speedIndex = storedSpeedIndex();
setPlaybackRate(SPEED_RATES[speedIndex]);
transportToggle.addEventListener("click", () => {
  setTransportMinimized(!transport.classList.contains("is-minimized"));
});
filmstripToggle?.addEventListener("click", () => {
  setFilmstripHidden(!stageEl.classList.contains("is-filmstrip-hidden"));
});
lyricsToggle?.addEventListener("click", () => {
  cycleLyricsMode();
});
playlistToggle?.addEventListener("click", () => {
  setPlaylistHidden(!topEl.classList.contains("is-playlist-hidden"));
});
playlistPeek?.addEventListener("click", () => setPlaylistHidden(false));
playlistPrev?.addEventListener("click", () => {
  playlistEl?.scrollBy({ left: -200, behavior: "smooth" });
});
playlistNext?.addEventListener("click", () => {
  playlistEl?.scrollBy({ left: 200, behavior: "smooth" });
});
backBtn.addEventListener("click", () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});
fwdBtn.addEventListener("click", () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});

function tick() {
  update();
  if (!audio.paused && !audio.ended) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = 0;
  }
}

audio.addEventListener("play", () => {
  setPlayUi(true);
  if (!rafId) rafId = requestAnimationFrame(tick);
});
audio.addEventListener("pause", () => {
  setPlayUi(false);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  update(true);
});
audio.addEventListener("timeupdate", () => update());
audio.addEventListener("seeked", () => update(true));
audio.addEventListener("loadedmetadata", () => {
  applyStoredPlaybackRate();
  scrub.max = String(Math.floor((audio.duration || 0) * 10));
  durationEl.textContent = fmt(audio.duration);
});
audio.addEventListener("error", () => {
  console.error("Audio element error", audio.error);
  setPlayUi(false);
  durationEl.textContent = "—";
});
audio.addEventListener("ended", () => {
  setPlayUi(false);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (currentLesson?.id) {
    setLessonComplete(currentLesson.id, true);
    renderPlaylist();
  }
});

lyricsViewport.addEventListener("wheel", markUserScrolling, { passive: true });
lyricsViewport.addEventListener("touchmove", markUserScrolling, { passive: true });

scrub.addEventListener("pointerdown", () => {
  scrubbing = true;
});
scrub.addEventListener("pointerup", () => {
  scrubbing = false;
  audio.currentTime = Number(scrub.value) / 10;
  update(true);
});
scrub.addEventListener("input", () => {
  const t = Number(scrub.value) / 10;
  currentTimeEl.textContent = fmt(t);
  const dur = audio.duration || Number(scrub.max) / 10 || 0;
  const progressPct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0;
  scrubFill.style.width = `${progressPct}%`;
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  } else if (e.code === "ArrowRight") {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  } else if (e.code === "ArrowUp") {
    e.preventDefault();
    seekToLyric(Math.max(0, activeIndex - 1));
  } else if (e.code === "ArrowDown") {
    e.preventDefault();
    seekToLyric(Math.min(lyrics.length - 1, activeIndex + 1));
  }
});

const catalogRes = await fetch(`media/lessons.json?v=${ASSET_V}`);
catalog = await catalogRes.json();
if (collectionTitleEl) collectionTitleEl.textContent = catalog.title || "Database fundamentals";
currentLesson = lessonFromUrl();
renderPlaylist();
window.addEventListener("popstate", () => {
  void applyLesson(lessonFromUrl());
});
try {
  if (localStorage.getItem(FILMSTRIP_PREF_KEY) === "1") setFilmstripHidden(true);
  restoreLyricsMode();
  setPlaylistHidden(false);
} catch {
  /* ignore */
}
if (currentLesson) await applyLesson(currentLesson);
