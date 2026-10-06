# Lesson authoring (goals → beats → visuals → speech)

Do this in order. Do not write narration first and reverse-engineer diagrams from lyrics.

1. **`learningGoals()` / `extractOutcomes(script)`** — what the learner can do after the lesson.
2. **`milestones(goals)`** — one idea per beat, plus what must stay on screen (`hold`).
3. **`visualPlan(milestones)`** — `kind`, `sceneIntent`, `reveal` actions. No spoken sentences.
4. **`narrationForMilestone(...)`** — copy that serves the visual and the goal.

Runtime playback is still `audio/player/visual-stage.js` + `media/cues.json`. Do **not** import `lesson-flow.js` into the player — `npx serve` roots at `audio/player/`, so `../authoring/` 404s and the whole module graph dies (empty lyrics, dead chevrons).

```bash
node audio/authoring/assert-sync.mjs
node audio/authoring/write-spoken.mjs
node audio/player/eval-visual-sync.mjs
```

## Fast audio (current voice: `en-US-AndrewNeural`)

Already in play: `edge-tts` (`/tmp/tts-venv/bin/edge-tts` or `audio/player/.venv`), ffmpeg splices, voice samples under `audio/voice-samples/`.

## Incremental audio (do not re-TTS the whole lesson)

Replace **one lyric** (or a range) inside the existing `narration.mp3`, then shift later cues:

```bash
python3 audio/player/tts-from-cues.py --splice --lyric 20 \
  --text "A relational database is a collection of related tables."
```

A scene’s lyric span:

```bash
python3 audio/player/tts-from-cues.py --splice --milestone enter-db
```

Updates `audio/player/media/narration.mp3`, `narration.vtt`, and `cues.json` (times after the splice point move by the duration delta). Then bump `?v=` in `index.html` / imports.

Preview-only clip (does **not** touch the lesson file):

```bash
python3 audio/player/tts-from-cues.py --cues --lyric 20
```

Full script → player files + cue rebuild (slow; only when the whole narration should change):

```bash
python3 audio/player/tts-from-cues.py audio/relational-databases-engaging-script.txt \
  -o audio/player/media/narration.mp3 --rebuild-cues
```

Flags: `--voice en-US-AndrewNeural --rate=-10% --pitch=-5Hz` (defaults). Then bump `?v=` in `index.html` / imports.

## How the player should consume this

| Authoring | Player |
|-----------|--------|
| milestone `id` | `SCENES[].id` |
| `visual.kind` / `sceneIntent` | `kind` / `sceneIntent` |
| `visual.reveal` | `steps[].actions` (still timed with `lyricMin` after cues exist) |
| `narration` | script → `tts-from-cues.py` → `narration.vtt` → `build-cues.py` → `cues.json` |

`lyricMin` is assigned **after** TTS, from `cues.json` line indexes — not the other way around.

## Parked: schema walkthrough

Long schema audio (~120.6s, lyrics 20–61) is already in `media/narration.mp3` / `cues.json`, with one-table-at-a-time steps on `enter-db`. Visual-sync eval: 0 fail. Browser step-through of slow reveals was mid-check when authoring work took priority.
