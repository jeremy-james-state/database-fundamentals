#!/usr/bin/env python3
"""Rebuild lesson slides as portrait frames: same content, no presenter/gradient."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "media" / "slides-landscape"
DST = ROOT / "media" / "slides"
CURRENT = ROOT / "media" / "slides"

# Near-square / slight portrait — matches the tall visual pane better than 16:9
OUT_W, OUT_H = 900, 1000
BG = (20, 20, 20)
CARD = (250, 250, 250)
CARD_PAD = 24
CONTENT_PAD = 36

# Presenter inset — generous box so none of the face remains
PRESENTER_BOX = (0.62, 0.42, 1.0, 1.0)


def ensure_landscape_backup() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    if any(SRC.glob("slide-*.png")):
        return
    for path in sorted(CURRENT.glob("slide-*.png")):
        with Image.open(path) as im:
            w, h = im.size
        if w > h * 1.1:
            (SRC / path.name).write_bytes(path.read_bytes())


def find_board(img: Image.Image) -> tuple[int, int, int, int]:
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    bright = []
    for y in range(int(h * 0.04), int(h * 0.96), 2):
        for x in range(int(w * 0.04), int(w * 0.96), 2):
            r, g, b = px[x, y]
            if r > 235 and g > 235 and b > 235 and abs(r - g) < 12 and abs(g - b) < 12:
                bright.append((x, y))
    if len(bright) < 200:
        return int(w * 0.1), int(h * 0.1), int(w * 0.9), int(h * 0.9)

    xs = [p[0] for p in bright]
    ys = [p[1] for p in bright]
    inset = 10
    return (
        max(0, min(xs) + inset),
        max(0, min(ys) + inset),
        min(w, max(xs) - inset),
        min(h, max(ys) - inset),
    )


def mask_presenter(board: Image.Image) -> Image.Image:
    out = board.copy().convert("RGB")
    w, h = out.size
    l = int(w * PRESENTER_BOX[0])
    t = int(h * PRESENTER_BOX[1])
    draw = ImageDraw.Draw(out)
    draw.rectangle((l, t, w, h), fill=CARD)
    return out


def content_bbox(board: Image.Image) -> tuple[int, int, int, int]:
    gray = board.convert("L")
    mask = gray.point(lambda p: 255 if p < 228 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(7))
    bbox = mask.getbbox()
    if not bbox:
        return 0, 0, board.width, board.height
    l, t, r, b = bbox
    pad = 22
    return (
        max(0, l - pad),
        max(0, t - pad),
        min(board.width, r + pad),
        min(board.height, b + pad),
    )


def compose_portrait(content: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (OUT_W, OUT_H), BG)
    card_w = OUT_W - CARD_PAD * 2
    card_h = OUT_H - CARD_PAD * 2
    card = Image.new("RGB", (card_w, card_h), CARD)

    inner_w = card_w - CONTENT_PAD * 2
    inner_h = card_h - CONTENT_PAD * 2

    # Prefer filling the card: scale up to the limiting dimension
    scale = min(inner_w / content.width, inner_h / content.height)
    new_w = max(1, int(content.width * scale))
    new_h = max(1, int(content.height * scale))
    fitted = content.resize((new_w, new_h), Image.Resampling.LANCZOS)

    x = (card_w - fitted.width) // 2
    y = (card_h - fitted.height) // 2
    card.paste(fitted, (x, y))
    canvas.paste(card, (CARD_PAD, CARD_PAD))
    return canvas


def process_one(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    board = img.crop(find_board(img))
    board = mask_presenter(board)
    content = board.crop(content_bbox(board))
    flat = Image.new("RGB", content.size, CARD)
    flat.paste(content, (0, 0))
    compose_portrait(flat).save(dst, "PNG", optimize=True)


def main() -> None:
    ensure_landscape_backup()
    sources = sorted(SRC.glob("slide-*.png"))
    if not sources:
        raise SystemExit(f"No slides found in {SRC}")
    for src in sources:
        process_one(src, DST / src.name)
        print(f"wrote {src.name}")
    print(f"done: {len(sources)} → {DST}")


if __name__ == "__main__":
    main()
