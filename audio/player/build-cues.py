#!/usr/bin/env python3
"""Parse narration.vtt into cues.json with lyric lines + timed slide bindings."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VTT = ROOT / "media" / "narration.vtt"
OUT = ROOT / "media" / "cues.json"
SLIDES = ROOT / "media" / "slides"

SLIDE_TS = re.compile(r"slide-\d+-(\d+)s\.png$", re.I)


def parse_ts(ts: str) -> float:
    # 00:00:01.234 / 00:00:01,234 / 00:01.234
    ts = ts.strip().replace(",", ".")
    parts = ts.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(parts[0])


def parse_vtt(text: str) -> list[dict]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cues = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if "-->" not in line:
            continue
        start_s, end_s = [p.strip().split(" ")[0] for p in line.split("-->")]
        start, end = parse_ts(start_s), parse_ts(end_s)
        body = []
        while i < len(lines) and lines[i].strip():
            body.append(lines[i].strip())
            i += 1
        text_body = " ".join(body).strip()
        if text_body:
            cues.append({"start": start, "end": end, "text": text_body})
    return cues


def ends_thought(text: str) -> bool:
    """True when the cue finishes a sentence (ignore trailing quotes)."""
    t = text.rstrip()
    while t and t[-1] in "\"'“”‘’":
        t = t[:-1].rstrip()
    return bool(t) and t[-1] in ".?!…:"


def merge_cues(raw: list[dict], max_chars: int = 90) -> list[dict]:
    """Merge tiny VTT fragments into readable lyric lines."""
    if not raw:
        return []
    merged = []
    buf = dict(raw[0])
    for cue in raw[1:]:
        candidate = f"{buf['text']} {cue['text']}".strip()
        gap = cue["start"] - buf["end"]
        if not ends_thought(buf["text"]) and len(candidate) <= max_chars and gap < 0.55:
            buf["text"] = candidate
            buf["end"] = cue["end"]
        else:
            merged.append(buf)
            buf = dict(cue)
    merged.append(buf)
    return merged


def load_slide_timeline(audio_duration: float) -> list[dict]:
    """Build slide cues from filenames like slide-12-0201s.png → start at 201s.

    Keep absolute times that fit the narration. Pack any later deck slides
    into the remaining tail so the full deck still appears.
    """
    timeline = []
    for path in sorted(SLIDES.glob("slide-*.png")):
        match = SLIDE_TS.search(path.name)
        if not match:
            continue
        timeline.append(
            {
                "start": float(match.group(1)),
                "src": f"slides/{path.name}",
            }
        )
    timeline.sort(key=lambda item: item["start"])
    dedup: dict[float, str] = {}
    for item in timeline:
        dedup[item["start"]] = item["src"]
    raw = [{"start": t, "src": src} for t, src in sorted(dedup.items())]
    if not raw:
        return []

    in_range = [item for item in raw if item["start"] <= audio_duration]
    overflow = [item for item in raw if item["start"] > audio_duration]
    if not overflow:
        return in_range

    if not in_range:
        # Entire deck is past the cut — scale everything into the audio.
        target = max(audio_duration - 1.5, 1.0)
        scale = target / raw[-1]["start"]
        return [
            {"start": round(item["start"] * scale, 3), "src": item["src"]} for item in raw
        ]

    # Keep faithful early timing; distribute leftover slides across the tail.
    t0 = in_range[-1]["start"]
    t1 = max(audio_duration - 1.0, t0 + 0.5)
    span = max(t1 - t0, 0.5)
    packed = []
    for i, item in enumerate(overflow, start=1):
        packed.append(
            {
                "start": round(t0 + span * (i / (len(overflow) + 1)), 3),
                "src": item["src"],
            }
        )
    return in_range + packed


def slide_at(timeline: list[dict], t: float) -> str:
    if not timeline:
        return ""
    chosen = timeline[0]["src"]
    for item in timeline:
        if item["start"] <= t:
            chosen = item["src"]
        else:
            break
    return chosen


def assign_slides(lyrics: list[dict], timeline: list[dict]) -> list[dict]:
    return [{**line, "slide": slide_at(timeline, line["start"])} for line in lyrics]


def main() -> None:
    raw = parse_vtt(VTT.read_text(encoding="utf-8"))
    lyrics_merged = merge_cues(raw)
    audio_duration = lyrics_merged[-1]["end"] if lyrics_merged else 0.0
    timeline = load_slide_timeline(audio_duration)
    lyrics = assign_slides(lyrics_merged, timeline)
    payload = {
        "title": "Relational databases",
        "subtitle": "Tables, entities, keys & SQL",
        "audio": "narration.mp3",
        "duration": audio_duration,
        "slides": timeline,
        "lyrics": lyrics,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT} ({len(lyrics)} lyric lines, "
        f"{len(timeline)} slides, {payload['duration']:.1f}s)"
    )


if __name__ == "__main__":
    main()
