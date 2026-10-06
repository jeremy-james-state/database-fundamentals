#!/usr/bin/env python3
"""Fast TTS for this lesson: cue/script text → mp3 + vtt (en-US-AndrewNeural).

Examples:
  python3 audio/player/tts-from-cues.py --splice --lyric 20 --text "A relational database is a collection of related tables."
  python3 audio/player/tts-from-cues.py --splice --lyric 20 --to-lyric 24 --file audio/authoring/spoken/enter-db.txt
  python3 audio/player/tts-from-cues.py --splice --milestone topics
  python3 audio/player/tts-from-cues.py --cues --lyric 20
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / "media"
DEFAULT_VOICE = "en-US-AndrewNeural"
DEFAULT_RATE = "-10%"
DEFAULT_PITCH = "-5Hz"


def find_edge_tts() -> str:
    for candidate in (
        os.environ.get("EDGE_TTS"),
        shutil.which("edge-tts"),
        "/tmp/tts-venv/bin/edge-tts",
        str(ROOT / ".venv/bin/edge-tts"),
    ):
        if candidate and Path(candidate).exists():
            return candidate
    sys.exit(
        "edge-tts not found. Install with:\n"
        "  python3 -m venv audio/player/.venv && "
        "audio/player/.venv/bin/pip install edge-tts\n"
        "or set EDGE_TTS to the binary."
    )


def probe_duration(path: Path) -> float:
    return float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            text=True,
        ).strip()
    )


def parse_ts(ts: str) -> float:
    ts = ts.strip().replace(",", ".")
    parts = ts.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(parts[0])


def fmt_ts(t: float) -> str:
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t - h * 3600 - m * 60
    ms = int(round((s - int(s)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{int(s):02d},{ms:03d}"


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


def write_vtt(cues: list[dict], path: Path) -> None:
    chunks = ["WEBVTT", ""]
    for i, c in enumerate(cues, 1):
        chunks.append(str(i))
        chunks.append(f"{fmt_ts(c['start'])} --> {fmt_ts(c['end'])}")
        chunks.append(c["text"])
        chunks.append("")
    path.write_text("\n".join(chunks), encoding="utf-8")


def run_edge_tts(body: str, out_mp3: Path, out_vtt: Path, voice: str, rate: str, pitch: str) -> None:
    edge = find_edge_tts()
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_mp3.with_suffix(".src.txt")
    tmp.write_text(body + "\n", encoding="utf-8")
    cmd = [
        edge,
        "--voice",
        voice,
        "--rate",
        rate,
        "--pitch",
        pitch,
        "--file",
        str(tmp),
        "--write-media",
        str(out_mp3),
        "--write-subtitles",
        str(out_vtt),
    ]
    subprocess.run(cmd, check=True)


def milestone_lyric_range(mid: str) -> tuple[int, int]:
    js = (ROOT / "visual-stage.js").read_text(encoding="utf-8")
    marker = f'id: "{mid}"'
    pos = js.find(marker)
    if pos < 0:
        sys.exit(f"Unknown --milestone {mid}")
    chunk = js[pos : pos + 400]
    fr = re.search(r"fromLyric:\s*(\d+)", chunk)
    to = re.search(r"toLyric:\s*(\d+)", chunk)
    if not fr or not to:
        sys.exit(f"Could not read fromLyric/toLyric for {mid}")
    return int(fr.group(1)), int(to.group(1)) - 1


def concat_audio(src: Path, clip: Path, dest: Path, t0: float, t1: float) -> None:
    dur = probe_duration(src)
    inputs = []
    labels = []
    n = 0
    if t0 > 0.02:
        inputs += ["-ss", "0", "-to", f"{t0:.3f}", "-i", str(src)]
        labels.append(f"[{n}:a]")
        n += 1
    inputs += ["-i", str(clip)]
    labels.append(f"[{n}:a]")
    n += 1
    if t1 < dur - 0.02:
        inputs += ["-ss", f"{t1:.3f}", "-i", str(src)]
        labels.append(f"[{n}:a]")
        n += 1
    filt = "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[a]"
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filt, "-map", "[a]", "-c:a", "libmp3lame", "-q:a", "2", str(dest)]
    subprocess.run(cmd, check=True)


def splice_into_narration(body: str, i0: int, i1: int, voice: str, rate: str, pitch: str) -> None:
    cues_path = MEDIA / "cues.json"
    mp3_path = MEDIA / "narration.mp3"
    vtt_path = MEDIA / "narration.vtt"
    payload = json.loads(cues_path.read_text(encoding="utf-8"))
    lyrics = payload.get("lyrics") or []
    if i0 < 0 or i1 >= len(lyrics) or i0 > i1:
        sys.exit(f"lyric range {i0}..{i1} out of 0..{len(lyrics) - 1}")
    t0 = float(lyrics[i0]["start"])
    t1 = float(lyrics[i1]["end"])
    old_len = t1 - t0

    work = Path("/tmp/rdb-tts")
    work.mkdir(parents=True, exist_ok=True)
    clip_mp3 = work / "splice-clip.mp3"
    clip_vtt = work / "splice-clip.vtt"
    run_edge_tts(body, clip_mp3, clip_vtt, voice, rate, pitch)
    new_len = probe_duration(clip_mp3)
    delta = new_len - old_len

    out_mp3 = work / "narration-spliced.mp3"
    concat_audio(mp3_path, clip_mp3, out_mp3, t0, t1)

    clip_cues = parse_vtt(clip_vtt.read_text(encoding="utf-8"))
    if not clip_cues:
        clip_cues = [{"start": 0.0, "end": new_len, "text": body}]
    inserted = [
        {
            "start": round(t0 + c["start"], 3),
            "end": round(t0 + c["end"], 3),
            "text": c["text"],
            "slide": lyrics[i0].get("slide", ""),
        }
        for c in clip_cues
    ]
    if len(inserted) == 1:
        inserted[0]["start"] = round(t0, 3)
        inserted[0]["end"] = round(t0 + new_len, 3)
        inserted[0]["text"] = body.replace("\n", " ").strip()

    shifted = []
    for line in lyrics[i1 + 1 :]:
        shifted.append(
            {
                **line,
                "start": round(float(line["start"]) + delta, 3),
                "end": round(float(line["end"]) + delta, 3),
            }
        )
    payload["lyrics"] = lyrics[:i0] + inserted + shifted
    payload["duration"] = round(float(payload.get("duration") or 0) + delta, 3)
    for slide in payload.get("slides") or []:
        if float(slide.get("start") or 0) >= t1 - 0.001:
            slide["start"] = round(float(slide["start"]) + delta, 3)
    cues_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    raw = parse_vtt(vtt_path.read_text(encoding="utf-8"))
    kept_before = [c for c in raw if c["end"] <= t0 + 0.02]
    kept_after = [
        {"start": c["start"] + delta, "end": c["end"] + delta, "text": c["text"]}
        for c in raw
        if c["start"] >= t1 - 0.02
    ]
    write_vtt(kept_before + inserted + kept_after, vtt_path)

    shutil.copyfile(out_mp3, mp3_path)
    print(
        f"Spliced lyrics {i0}–{i1} @ {t0:.3f}–{t1:.3f}s  "
        f"old={old_len:.3f}s new={new_len:.3f}s delta={delta:+.3f}s"
    )
    print(f"Updated {mp3_path}")
    print(f"Updated {vtt_path}")
    print(f"Updated {cues_path} ({len(payload['lyrics'])} lyrics)")
    if len(inserted) != (i1 - i0 + 1):
        print(
            f"WARN lyric count changed by {len(inserted) - (i1 - i0 + 1)}; "
            "remap visual-stage.js fromLyric/lyricMin if needed."
        )


def text_from_cues(lyric_index: int | None) -> str:
    cues = json.loads((MEDIA / "cues.json").read_text(encoding="utf-8"))
    lines = cues.get("lyrics") or []
    if lyric_index is None:
        return "\n\n".join(item.get("text", "").strip() for item in lines if item.get("text"))
    if lyric_index < 0 or lyric_index >= len(lines):
        sys.exit(f"--lyric {lyric_index} out of range (0..{len(lines) - 1})")
    return str(lines[lyric_index].get("text") or "").strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", nargs="?", help="UTF-8 text file (script or single beat)")
    parser.add_argument("--text", help="Raw string instead of a file")
    parser.add_argument("--file", dest="file_in", help="Text file (alias of positional source)")
    parser.add_argument("--cues", action="store_true", help="Read audio/player/media/cues.json")
    parser.add_argument("--lyric", type=int, help="Lyric index (fast beat / splice start)")
    parser.add_argument("--to-lyric", type=int, dest="to_lyric", help="Inclusive end lyric for --splice")
    parser.add_argument("--milestone", help="Splice the visual-stage scene id (fromLyric..toLyric-1)")
    parser.add_argument("--splice", action="store_true", help="TTS only this range and concat into narration.mp3")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--rate", default=DEFAULT_RATE)
    parser.add_argument("--pitch", default=DEFAULT_PITCH)
    parser.add_argument("-o", "--out", help="Output mp3 (default: media/narration.mp3 or /tmp beat)")
    parser.add_argument("--vtt", help="Output vtt path")
    parser.add_argument("--rebuild-cues", action="store_true", help="Run build-cues.py after writing media/narration.*")
    args = parser.parse_args()

    if args.splice:
        cues = json.loads((MEDIA / "cues.json").read_text(encoding="utf-8"))
        lines = cues.get("lyrics") or []
        if args.milestone:
            i0, i1 = milestone_lyric_range(args.milestone)
        elif args.lyric is not None:
            i0 = args.lyric
            i1 = args.to_lyric if args.to_lyric is not None else args.lyric
        else:
            sys.exit("--splice needs --lyric N or --milestone id")
        src_path = Path(args.file_in or args.source) if (args.file_in or args.source) else None
        if args.text:
            body = args.text.strip()
        elif src_path:
            body = src_path.read_text(encoding="utf-8").strip()
        elif args.milestone:
            spoken = ROOT.parent / "authoring" / "spoken" / f"{args.milestone}.txt"
            if spoken.exists():
                body = spoken.read_text(encoding="utf-8").strip()
            else:
                body = " ".join(str(lines[i].get("text") or "") for i in range(i0, i1 + 1)).strip()
        else:
            body = " ".join(str(lines[i].get("text") or "") for i in range(i0, i1 + 1)).strip()
        if not body:
            sys.exit("No text to splice.")
        splice_into_narration(body, i0, i1, args.voice, args.rate, args.pitch)
        return

    if args.text:
        body = args.text.strip()
        stem = "clip"
    elif args.cues:
        body = text_from_cues(args.lyric)
        stem = f"lyric-{args.lyric}" if args.lyric is not None else "from-cues"
    elif args.source:
        path = Path(args.source)
        body = path.read_text(encoding="utf-8").strip()
        stem = path.stem
    else:
        default_script = ROOT.parent / "relational-databases-engaging-script.txt"
        body = default_script.read_text(encoding="utf-8").strip()
        stem = "narration"

    if not body:
        sys.exit("No text to speak.")

    beat = args.lyric is not None or args.text or (args.source and Path(args.source).parent.name == "spoken")
    out_mp3 = Path(args.out) if args.out else (Path(f"/tmp/rdb-tts/{stem}.mp3") if beat else MEDIA / "narration.mp3")
    out_vtt = Path(args.vtt) if args.vtt else out_mp3.with_suffix(".vtt")
    out_mp3.parent.mkdir(parents=True, exist_ok=True)

    edge = find_edge_tts()
    cmd = [
        edge,
        "--voice",
        args.voice,
        "--rate",
        args.rate,
        "--pitch",
        args.pitch,
        "--text" if args.text or (args.cues and args.lyric is not None) else "--file",
    ]
    # edge-tts --file needs a path; for --text / cues-one-line use --text
    use_text_flag = bool(args.text) or (args.cues and args.lyric is not None) or len(body) < 4000
    if use_text_flag:
        cmd = [
            edge,
            "--voice",
            args.voice,
            "--rate",
            args.rate,
            "--pitch",
            args.pitch,
            "--text",
            body,
            "--write-media",
            str(out_mp3),
            "--write-subtitles",
            str(out_vtt),
        ]
    else:
        tmp = out_mp3.with_suffix(".src.txt")
        tmp.write_text(body + "\n", encoding="utf-8")
        cmd = [
            edge,
            "--voice",
            args.voice,
            "--rate",
            args.rate,
            "--pitch",
            args.pitch,
            "--file",
            str(tmp),
            "--write-media",
            str(out_mp3),
            "--write-subtitles",
            str(out_vtt),
        ]

    print(" ".join(cmd[:6]), "…")
    subprocess.run(cmd, check=True)
    print(f"Wrote {out_mp3}")
    print(f"Wrote {out_vtt}")

    if args.rebuild_cues:
        if out_mp3.resolve() != (MEDIA / "narration.mp3").resolve():
            sys.exit("--rebuild-cues only applies when output is audio/player/media/narration.mp3")
        subprocess.run([sys.executable, str(ROOT / "build-cues.py")], check=True)


if __name__ == "__main__":
    main()
