import { createVisualController } from "./visual-render.js?v=56";
import { buildChapters } from "./visual-stage.js?v=56";

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
const brandToggle = document.getElementById("brandToggle");
const controlsToggle = document.getElementById("controlsToggle");
const transport = document.getElementById("transport");
const transportToggle = document.getElementById("transportToggle");
const lyricsEl = document.getElementById("lyrics");
const lyricsViewport = document.getElementById("lyricsViewport");
const stageEl = document.getElementById("stage");
const filmstripEl = document.getElementById("filmstrip");
const filmstripToggle = document.getElementById("filmstripToggle");
const lyricsToggle = document.getElementById("lyricsToggle");
const slideEl = document.getElementById("slide");
const visualStage = document.getElementById("visualStage");
const titleEl = document.getElementById("title");
const visual = createVisualController(visualStage, slideEl);
const FILMSTRIP_PREF_KEY = "df-player-filmstrip-hidden";

const SPEED_RATES = [0.75, 1, 1.25, 1.5, 2];
let speedIndex = 1;

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

function formatRate(rate) {
  return `${rate}×`;
}

function setPlaybackRate(rate) {
  audio.playbackRate = rate;
  speedBtn.textContent = formatRate(rate);
  speedBtn.dataset.rate = String(rate);
  speedBtn.setAttribute("aria-label", `Playback speed ${formatRate(rate)}`);
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

function scrollActiveIntoView(index) {
  if (userScrolling) return;
  const node = lyricsEl.children[index];
  if (!node || !lyricsViewport) return;
  const nodeTop = node.offsetTop;
  const nodeH = node.offsetHeight;
  const viewH = lyricsViewport.clientHeight;
  const target = nodeTop - viewH / 2 + nodeH / 2;
  lyricsViewport.scrollTo({
    top: Math.max(0, target),
    behavior: "smooth",
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

function setBrandHidden(hidden) {
  topEl.classList.toggle("is-brand-hidden", hidden);
  brandToggle.setAttribute("aria-expanded", String(!hidden));
  brandToggle.setAttribute("aria-label", hidden ? "Show title" : "Hide title");
  brandToggle.title = hidden ? "Show title" : "Hide title";
}

function setControlsHidden(hidden) {
  topEl.classList.toggle("is-controls-hidden", hidden);
  controlsToggle.setAttribute("aria-expanded", String(!hidden));
  controlsToggle.setAttribute(
    "aria-label",
    hidden ? "Show playback controls" : "Hide playback controls"
  );
  controlsToggle.title = hidden ? "Show playback controls" : "Hide playback controls";
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

function setLyricsHidden(hidden) {
  if (!stageEl || !lyricsToggle) return;
  stageEl.classList.toggle("is-lyrics-hidden", hidden);
  lyricsToggle.setAttribute("aria-expanded", String(!hidden));
  lyricsToggle.setAttribute("aria-label", hidden ? "Show lyrics" : "Hide lyrics");
  lyricsToggle.title = hidden ? "Show lyrics" : "Hide lyrics";
}

function update(force = false) {
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

  if (idx >= 0) scrollActiveIntoView(idx);
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
setPlaybackRate(SPEED_RATES[speedIndex]);
brandToggle.addEventListener("click", () => {
  setBrandHidden(!topEl.classList.contains("is-brand-hidden"));
});
controlsToggle.addEventListener("click", () => {
  setControlsHidden(!topEl.classList.contains("is-controls-hidden"));
});
transportToggle.addEventListener("click", () => {
  setTransportMinimized(!transport.classList.contains("is-minimized"));
});
filmstripToggle?.addEventListener("click", () => {
  setFilmstripHidden(!stageEl.classList.contains("is-filmstrip-hidden"));
});
lyricsToggle?.addEventListener("click", () => {
  setLyricsHidden(!stageEl.classList.contains("is-lyrics-hidden"));
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
  }
});

const data = await fetch("media/cues.json?v=56").then((r) => r.json());
titleEl.textContent = data.title;
lyrics = data.lyrics || [];
slides = data.slides || [];
if (!slides.length) {
  const seen = new Map();
  for (const line of lyrics) {
    if (line.slide && !seen.has(line.slide)) seen.set(line.slide, line.start);
  }
  slides = [...seen.entries()]
    .map(([src, start]) => ({ src, start }))
    .sort((a, b) => a.start - b.start);
}
chapters = buildChapters(lyrics);
renderFilmstrip();
renderLyrics();
try {
  if (localStorage.getItem(FILMSTRIP_PREF_KEY) === "1") setFilmstripHidden(true);
} catch {
  /* ignore */
}
durationEl.textContent = fmt(data.duration || 0);
update(true);
