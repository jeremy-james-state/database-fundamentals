#!/usr/bin/env python3
"""Render cleaned dark lesson slides from exact original content.

Teaching slides are redrawn with a dark muted palette (no presenter, no
CS50 gradient). Screen-demo slides (22–30) keep the original UI pixels,
cropped onto a dark canvas with the webcam inset covered.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "media" / "slides-original"
OUT = ROOT / "media" / "slides"

W, H = 1280, 720
BG = (20, 20, 20)  # #141414
PANEL = (28, 28, 30)
PANEL_EDGE = (48, 48, 52)
TEXT = (232, 230, 228)
MUTED = (156, 152, 148)
DIM = (96, 92, 88)
ACCENT = (196, 92, 82)  # muted ember, not CS50 rainbow
ACCENT_SOFT = (196, 92, 82, 55)
LINE = (58, 56, 54)
HEADER_BG = (36, 35, 34)
ROW_ALT = (24, 24, 25)
OK = (140, 180, 140)
BAD = (200, 90, 85)
BLUE = (110, 150, 200)
SQL_BLUE = (130, 170, 220)
HIGHLIGHT_RED = (180, 70, 65)
HIGHLIGHT_BLUE = (70, 120, 180)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
            "/System/Library/Fonts/SFNS.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def mono(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/Supplemental/Menlo.ttc",
            "/System/Library/Fonts/Menlo.ttc",
            "/System/Library/Fonts/Monaco.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Supplemental/Menlo.ttc",
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Monaco.ttf",
        "/System/Library/Fonts/SFNSMono.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return font(size, bold)


def canvas() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    # subtle ember wash top-left — muted, not a frame
    for i in range(280):
        a = int(18 * (1 - i / 280))
        draw.ellipse((-180 + i, -220 + i, 420 - i, 380 - i), fill=(90, 30, 28, a))
    return img.convert("RGB")


def draw_title(draw: ImageDraw.ImageDraw, text: str, x: int = 64, y: int = 48, size: int = 36) -> int:
    draw.text((x, y), text, fill=TEXT, font=font(size, bold=True))
    return y + size + 18


def draw_subtitle(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, color=MUTED, size: int = 24) -> int:
    draw.text((x, y), text, fill=color, font=font(size))
    return y + size + 16


def measure(draw: ImageDraw.ImageDraw, text: str, fnt) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_table(
    img: Image.Image,
    origin: tuple[int, int],
    headers: list[str],
    rows: list[list[str]],
    col_widths: list[int] | None = None,
    show_index: bool = False,
    index_header: str = "",
    font_size: int = 18,
    row_h: int = 40,
    highlights: list[dict] | None = None,
    cell_colors: dict | None = None,
) -> tuple[int, int, int, int]:
    """Draw a clean table. Returns bounding box (x0,y0,x1,y1)."""
    draw = ImageDraw.Draw(img, "RGBA")
    f = mono(font_size)
    fh = mono(font_size, bold=True)
    x0, y0 = origin

    data_cols = list(headers)
    data_rows = [list(r) for r in rows]
    if show_index:
        data_cols = [index_header or ""] + data_cols
        data_rows = [[str(i)] + r for i, r in enumerate(data_rows)]

    if col_widths is None:
        col_widths = []
        for ci, h in enumerate(data_cols):
            widest = measure(draw, h, fh)[0]
            for r in data_rows:
                widest = max(widest, measure(draw, r[ci], f)[0])
            col_widths.append(widest + 28)

    table_w = sum(col_widths)
    header_h = row_h
    table_h = header_h + row_h * len(data_rows)

    # panel
    draw.rounded_rectangle(
        (x0 - 2, y0 - 2, x0 + table_w + 2, y0 + table_h + 2),
        radius=10,
        fill=PANEL,
        outline=PANEL_EDGE,
        width=1,
    )

    # header bg
    draw.rectangle((x0, y0, x0 + table_w, y0 + header_h), fill=HEADER_BG)

    # rows
    for ri, row in enumerate(data_rows):
        y = y0 + header_h + ri * row_h
        if ri % 2 == 1:
            draw.rectangle((x0, y, x0 + table_w, y + row_h), fill=ROW_ALT)

    # header text
    x = x0
    for ci, h in enumerate(data_cols):
        pad = 12
        draw.text((x + pad, y0 + (header_h - font_size) // 2 - 1), h, fill=MUTED, font=fh)
        x += col_widths[ci]

    # body text
    for ri, row in enumerate(data_rows):
        y = y0 + header_h + ri * row_h
        x = x0
        for ci, cell in enumerate(row):
            color = TEXT
            if cell_colors and (ri, ci if not show_index else ci) in cell_colors:
                color = cell_colors[(ri, ci)]
            # map cell colors with show_index offset
            key = (ri, ci - (1 if show_index else 0))
            if cell_colors and key in cell_colors and (not show_index or ci > 0):
                color = cell_colors[key]
            if cell in ("✓", "v", "✔"):
                color = OK
                cell = "✓"
            elif cell in ("✘", "✖", "x", "X"):
                color = BAD
                cell = "✕"
            elif cell == "(missing)":
                color = DIM
            pad = 12
            draw.text((x + pad, y + (row_h - font_size) // 2 - 1), cell, fill=color, font=f)
            x += col_widths[ci]

    # grid lines
    draw.line((x0, y0 + header_h, x0 + table_w, y0 + header_h), fill=LINE, width=1)
    if show_index:
        draw.line((x0 + col_widths[0], y0, x0 + col_widths[0], y0 + table_h), fill=LINE, width=1)

    # highlights after grid
    if highlights:
        for hl in highlights:
            # hl: row_start, row_end inclusive, col_start, col_end (data cols, 0-based), color
            rs, re = hl["rows"]
            cs, ce = hl["cols"]
            color = hl.get("color", HIGHLIGHT_RED)
            ox = x0 + (col_widths[0] if show_index else 0)
            for c in range(cs):
                ox += col_widths[c + (1 if show_index else 0)]
            ow = sum(col_widths[c + (1 if show_index else 0)] for c in range(cs, ce + 1))
            oy = y0 + header_h + rs * row_h
            oh = (re - rs + 1) * row_h
            draw.rounded_rectangle(
                (ox + 2, oy + 2, ox + ow - 2, oy + oh - 2),
                radius=6,
                outline=color + (220,),
                width=2,
            )

    return x0, y0, x0 + table_w, y0 + table_h


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    print("wrote", path.name)


# --- Exact content helpers ---

MEMBERS_CLEAN = [
    ["Maya Patel", "maya.patel@email.com", "555-123-4567"],
    ["Jordan Lee", "jordanl@email.com", "555-987-6543"],
    ["Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
    ["Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
]

MEMBERS_MESSY = [
    ["Maya Patel", "maya.patel@email.com", "555-123-4567"],
    ["Jordan Lee", "jordan.lee@email.com", "(missing)"],
    ["Jordan Lee", "jordanl@email.com", "555-987-6543"],
    ["Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
    ["Carlos Rivera", "(missing)", "555-234-1122"],
    ["Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
]

MEMBERS_EXTRA = [
    ["Maya Patel", "maya.patel@email.com", "555-123-4567", "", "✓", "?"],
    ["Jordan Lee", "jordan.lee@email.com", "(missing)", "✓", "✓", "✓"],
    ["Jordan Lee", "jordanl@email.com", "555-987-6543", "✕", "✓", "✕"],
    ["Sofia Nguyen", "sofia.n@email.com", "555-456-7890", "", "✓", ""],
    ["Carlos Rivera", "(missing)", "555-234-1122", "✕", "", ""],
    ["Carlos Rivera", "carlos.r@email.com", "555-234-1122", "✓", "", ""],
]

BAD_PRODUCT = [
    ["1", "Atomic Nose ...", "19.99", "Mad Inventors Inc.", "a1", "Bob", "bob@gmail.com", "5"],
    ["2", "Selfie Toaster", "24.99", "Goofy Gadgets Corp.", "b2", "Dave", "dave@outlook.com", "15"],
    ["3", "Cat-Poop Coffee", "29.99", "Absurd Accessories", "a1", "Bob", "bob@gmail.com", "2"],
    ["...", "...", "...", "...", "...", "...", "...", "..."],
    ["9", "The Infinite ...", "9.99", "Silly Supplies Co.", "j8", "John", "john@123.net", "1"],
    ["10", "The Neuralyzer", "33.55", "Silly Supplies Co.", "p9", "Katy", "katy@123.net", "2"],
]

BAD_HEADERS = [
    "product_id",
    "name",
    "price",
    "manufacturer",
    "customer_id",
    "customer_name",
    "customer_email",
    "quantity",
]

PRODUCT = [
    ["1", "Atomic Nose Hair Trimmer", "...", "19.99", "Mad Inventors Inc."],
    ["2", "Selfie Toaster", "...", "24.99", "Goofy Gadgets Corp."],
    ["3", "Cat-Poop Coffee", "...", "29.99", "Absurd Accessories"],
    ["...", "...", "", "...", "..."],
    ["9", "The Infinite Improbability Generator", "...", "9.99", "Silly Supplies Co."],
    ["10", "The Neuralyzer", "...", "33.55", "Silly Supplies Co."],
]

PRODUCT_HEADERS = ["product_id", "name", "description", "price", "manufacturer"]

RESULT_NAMES = [
    ["Selfie Toaster"],
    ["Cat-Poop Coffee"],
    ["Inflatable Briefcase"],
    ["Lightsabers"],
    ["The Neuralyzer"],
]


def slide_01():
    img = canvas()
    draw = ImageDraw.Draw(img)
    draw_table(
        img,
        (120, 160),
        ["Name", "Email", "Phone"],
        MEMBERS_CLEAN,
        show_index=True,
        col_widths=[48, 180, 260, 180],
        font_size=20,
        row_h=48,
    )
    save(img, "slide-01-0001s.png")


def slide_02():
    img = canvas()
    draw_table(
        img,
        (100, 110),
        ["Name", "Email", "Phone"],
        MEMBERS_MESSY,
        show_index=True,
        col_widths=[48, 180, 260, 180],
        font_size=18,
        row_h=44,
        highlights=[
            {"rows": (1, 2), "cols": (0, 2), "color": HIGHLIGHT_RED},
            {"rows": (4, 5), "cols": (0, 2), "color": HIGHLIGHT_RED},
        ],
    )
    save(img, "slide-02-0010s.png")


def slide_03():
    img = canvas()
    draw_table(
        img,
        (48, 40),
        ["Name", "Email", "Phone", "committee", "Paid?", "RSVP"],
        MEMBERS_EXTRA,
        show_index=True,
        col_widths=[40, 150, 230, 150, 100, 70, 70],
        font_size=15,
        row_h=36,
    )
    # Paste original rabbit illustrations (no new labels)
    art = ROOT / "media" / "assets" / "rabbits-clean.png"
    if art.exists():
        rabbits = Image.open(art).convert("RGBA")
        # scale to fit under table
        max_w = 520
        scale = min(1.0, max_w / rabbits.width)
        rabbits = rabbits.resize(
            (int(rabbits.width * scale), int(rabbits.height * scale)),
            Image.Resampling.LANCZOS,
        )
        # composite onto dark panel
        px, py = 380, 340
        panel = Image.new("RGBA", (rabbits.width + 24, rabbits.height + 24), (*PANEL, 255))
        img.paste(panel, (px - 12, py - 12), panel)
        img.paste(rabbits, (px, py), rabbits)
    save(img, "slide-03-0015s.png")


def slide_title_only(name: str, title: str, subtitle: str | None = None, title_color=TEXT):
    img = canvas()
    draw = ImageDraw.Draw(img)
    draw.text((64, 56), title, fill=title_color, font=font(40, bold=True))
    if subtitle:
        draw.text((64, 120), subtitle, fill=MUTED, font=font(26))
    save(img, name)


def mini_empty_table(draw, x, y, headers, n_rows, col_w=70):
    f = mono(12)
    fh = mono(12, bold=True)
    row_h = 22
    idx_w = 22
    widths = [idx_w] + [col_w] * len(headers)
    tw = sum(widths)
    th = row_h * (1 + n_rows)
    draw.rounded_rectangle((x, y, x + tw, y + th), radius=6, fill=PANEL, outline=PANEL_EDGE)
    draw.rectangle((x, y, x + tw, y + row_h), fill=HEADER_BG)
    cx = x + idx_w
    for h, w in zip(headers, widths[1:]):
        draw.text((cx + 4, y + 4), h, fill=MUTED, font=fh)
        cx += w
    draw.line((x + idx_w, y, x + idx_w, y + th), fill=LINE, width=1)
    draw.line((x, y + row_h, x + tw, y + row_h), fill=LINE, width=1)
    for i in range(n_rows):
        draw.text((x + 6, y + row_h + i * row_h + 3), str(i), fill=DIM, font=f)
    return x, y, x + tw, y + th


def slide_05(with_apps: bool = False, out: str = "slide-05-0033s.png"):
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((64, 36), "Enter: The Relational Database", fill=ACCENT, font=font(32, bold=True))

    # positions for five tables
    t1 = mini_empty_table(draw, 480, 90, ["email", "id", "password"], 3, 78)
    t2 = mini_empty_table(draw, 80, 260, ["product_id", "product_name"], 5, 100)
    t3 = mini_empty_table(draw, 520, 280, ["review_id", "text", "time", "email"], 4, 70)
    t4 = mini_empty_table(draw, 80, 500, ["state_id", "state"], 5, 80)
    t5 = mini_empty_table(draw, 480, 500, ["address_id", "street", "city", "postal_code"], 4, 78)

    def center(box):
        return ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2)

    c1, c2, c3, c4, c5 = map(center, (t1, t2, t3, t4, t5))
    for a, b in ((c1, c2), (c1, c3), (c1, c4), (c1, c5), (c2, c3), (c4, c5)):
        draw.line([a, b], fill=DIM, width=1)

    if with_apps:
        icons_path = ROOT / "media" / "assets" / "app-icons.png"
        if icons_path.exists():
            icons = Image.open(icons_path).convert("RGB")
            max_h = 480
            scale = min(1.0, max_h / icons.height, 300 / icons.width)
            icons = icons.resize(
                (int(icons.width * scale), int(icons.height * scale)),
                Image.Resampling.LANCZOS,
            )
            ix, iy = 940, 120
            draw.rounded_rectangle(
                (ix - 8, iy - 8, ix + icons.width + 8, iy + icons.height + 8),
                radius=10,
                fill=PANEL,
                outline=PANEL_EDGE,
            )
            img.paste(icons, (ix, iy))

    save(img, out)


def slide_07():
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "Topic List")
    items = [
        ("Relational database", ["Table", "Entity", "Primary keys"]),
        ("Relational database management systems (RDBMS)", ["Structured Query Language (SQL)"]),
        ("First taste of SQL", []),
    ]
    x = 80
    for title, kids in items:
        draw.ellipse((x, y + 8, x + 10, y + 18), fill=TEXT)
        draw.text((x + 24, y), title, fill=TEXT, font=font(26, bold=True))
        y += 40
        for kid in kids:
            draw.ellipse((x + 28, y + 8, x + 36, y + 16), outline=MUTED, width=2)
            draw.text((x + 48, y), kid, fill=MUTED, font=font(22))
            y += 34
        y += 12
    save(img, "slide-07-0047s.png")


def slide_08():
    slide_title_only(
        "slide-08-0057s.png",
        "Relational database",
        "What are relational databases and tables?",
    )


def slide_09():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    y = draw_title(draw, "Relational database")
    y = draw_subtitle(draw, "What are relational databases and tables?", 64, y)
    y = draw_subtitle(draw, "A relational database is collection of tables.", 64, y, TEXT, 22)
    y = draw_subtitle(draw, "A table is:", 64, y, TEXT, 22)
    bullets = [
        "like a spreadsheet where data is organized into rows and columns",
        "used to represent an entity or a relationship between entities",
    ]
    for i, b in enumerate(bullets):
        draw.ellipse((80, y + 8, 90, y + 18), fill=MUTED)
        if i == 1:
            tw, th = measure(draw, b, font(20))
            draw.rounded_rectangle(
                (100, y - 4, 110 + tw + 16, y + th + 10),
                radius=6,
                outline=ACCENT + (160,),
                width=2,
            )
        draw.text((108, y), b, fill=TEXT, font=font(20))
        y += 44
    save(img, "slide-09-0091s.png")


def slide_10():
    slide_title_only("slide-10-0098s.png", "Relational database", "What is an entity?")


def slide_11_12(name: str):
    img = canvas()
    draw = ImageDraw.Draw(img)
    draw.text((64, 56), "Relational database", fill=TEXT, font=font(36, bold=True))
    draw.text((64, 110), "A table is not the same as a spreadsheet", fill=ACCENT, font=font(24))
    save(img, name)


def slide_bad_product(name: str, with_highlights: bool):
    img = canvas()
    draw = ImageDraw.Draw(img)
    draw.text((48, 28), "Relational database", fill=TEXT, font=font(30, bold=True))
    draw.text((48, 72), "A table is not the same as a spreadsheet", fill=ACCENT, font=font(22))
    draw.ellipse((56, 118, 66, 128), fill=MUTED)
    draw.text((78, 110), 'A "bad" product table', fill=TEXT, font=font(20))
    highlights = None
    if with_highlights:
        # Original marks duplicate customer_id a1 and manufacturer Silly Supplies Co.
        highlights = [
            {"rows": (0, 0), "cols": (4, 4), "color": HIGHLIGHT_RED},
            {"rows": (2, 2), "cols": (4, 4), "color": HIGHLIGHT_RED},
            {"rows": (4, 4), "cols": (3, 3), "color": HIGHLIGHT_BLUE},
            {"rows": (5, 5), "cols": (3, 3), "color": HIGHLIGHT_BLUE},
        ]
    draw_table(
        img,
        (36, 160),
        BAD_HEADERS,
        BAD_PRODUCT,
        col_widths=[90, 150, 70, 170, 100, 120, 150, 80],
        font_size=13,
        row_h=34,
        highlights=highlights,
    )
    save(img, name)


def slide_15():
    slide_title_only(
        "slide-15-0262s.png",
        "Relational database management systems",
        "What’s a relational database management systems (RDBMS)?",
    )


def slide_16_17(name: str):
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "Relational database management systems", size=30)
    y = draw_subtitle(
        draw,
        "What’s a relational database management systems (RDBMS)?",
        64,
        y,
        MUTED,
        20,
    )
    y = draw_subtitle(draw, "An RDBMS is software that:", 64, y, TEXT, 22)

    left = [
        "interacts with the underlying hardware and operating system to physically store and manage data in relational databases",
        "Some common RDBMS - MySQL, MariaDB, PostgreSQL, and SQLite",
    ]
    right = [
        "provides tools and functions to manage databases",
        "SQL: a programming language that you can use to create, modify, and query data stored in tables in an RDBMS",
    ]

    def column(items, x, y0, nested_second=True):
        yy = y0
        for i, text in enumerate(items):
            indent = 0 if i == 0 else 20
            bullet_x = x + indent
            if i == 0:
                draw.ellipse((bullet_x, yy + 8, bullet_x + 10, yy + 18), fill=TEXT)
            else:
                draw.ellipse((bullet_x, yy + 8, bullet_x + 8, yy + 16), outline=MUTED, width=2)
            # wrap
            fnt = font(17)
            words = text.split()
            lines = []
            cur = ""
            max_w = 500
            for w in words:
                trial = (cur + " " + w).strip()
                if measure(draw, trial, fnt)[0] <= max_w:
                    cur = trial
                else:
                    lines.append(cur)
                    cur = w
            if cur:
                lines.append(cur)
            for li, line in enumerate(lines):
                draw.text((bullet_x + 20, yy + li * 24), line, fill=TEXT if i == 0 else MUTED, font=fnt)
            yy += 24 * len(lines) + 18
        return yy

    column(left, 64, y)
    column(right, 640, y)
    save(img, name)


def slide_18():
    slide_title_only("slide-18-0402s.png", "First taste of SQL")


def slide_19():
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "First taste of SQL")
    # sentence with Sci-Fi Collective in accent blue
    prefix = "The product table from "
    mid = "The Sci-Fi Collective"
    suffix = " database:"
    draw.text((64, y), prefix, fill=TEXT, font=font(22))
    pw = measure(draw, prefix, font(22))[0]
    draw.text((64 + pw, y), mid, fill=BLUE, font=font(22, bold=True))
    mw = measure(draw, mid, font(22, bold=True))[0]
    draw.text((64 + pw + mw, y), suffix, fill=TEXT, font=font(22))
    draw_table(
        img,
        (64, y + 50),
        PRODUCT_HEADERS,
        PRODUCT[:-1],  # slide 19 ends at row 9, no Neuralyzer in crop description
        col_widths=[90, 320, 90, 70, 180],
        font_size=15,
        row_h=36,
    )
    save(img, "slide-19-0421s.png")


def slide_20():
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "First taste of SQL")
    q = "How do we get the product names from the product table whose price is above $20?"
    # wrap question
    fnt = font(20)
    words = q.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if measure(draw, trial, fnt)[0] <= 1100:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        draw.text((64, y), line, fill=TEXT, font=fnt)
        y += 28
    draw_table(
        img,
        (64, y + 20),
        PRODUCT_HEADERS,
        PRODUCT[:-1],
        col_widths=[90, 320, 90, 70, 180],
        font_size=15,
        row_h=34,
    )
    save(img, "slide-20-0423s.png")


def draw_sql_block(draw, x, y, lines):
    f = mono(18)
    kw = {"SELECT", "FROM", "WHERE"}
    for i, line in enumerate(lines):
        parts = line.split(" ")
        cx = x
        for pi, part in enumerate(parts):
            color = SQL_BLUE if part.upper().rstrip(";") in kw or part.rstrip(";") in kw else TEXT
            # keep semicolon with last token
            token = part + (" " if pi < len(parts) - 1 else "")
            draw.text((cx, y + i * 28), token, fill=color, font=f)
            cx += measure(draw, token, f)[0]


def slide_21_31(name: str):
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    y = draw_title(draw, "First taste of SQL", size=30)
    q = "How do we get the product names from the product table whose price is above $20?"
    fnt = font(18)
    words = q.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if measure(draw, trial, fnt)[0] <= 1100:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        draw.text((48, y), line, fill=TEXT, font=fnt)
        y += 26

    draw_table(
        img,
        (40, y + 10),
        PRODUCT_HEADERS,
        PRODUCT,
        col_widths=[78, 210, 70, 60, 150],
        font_size=12,
        row_h=28,
    )
    sql_x, sql_y = 640, y + 40
    draw_sql_block(
        draw,
        sql_x,
        sql_y,
        ["SELECT name", "FROM product", "WHERE price > 20;"],
    )
    # arrow
    draw.polygon(
        [(860, sql_y + 40), (900, sql_y + 28), (900, sql_y + 36), (940, sql_y + 36), (940, sql_y + 44), (900, sql_y + 44), (900, sql_y + 52)],
        fill=ACCENT,
    )
    draw_table(
        img,
        (960, y + 10),
        ["name"],
        RESULT_NAMES,
        col_widths=[200],
        font_size=14,
        row_h=30,
    )
    save(img, name)


def slide_32():
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "First taste of SQL")
    y = draw_subtitle(draw, "SQL is like English, with little to no small talk.", 64, y, TEXT, 24)
    draw_sql_block(draw, 64, y + 20, ["SELECT name", "FROM product", "WHERE price > 20;"])
    save(img, "slide-32-0746s.png")


def slide_33():
    img = canvas()
    draw = ImageDraw.Draw(img)
    y = draw_title(draw, "First taste of SQL")
    y = draw_subtitle(draw, "SQL is like English, with little to no small talk.", 64, y, TEXT, 22)
    y = draw_subtitle(draw, "Three SQL clauses:", 64, y, TEXT, 22)
    draw.ellipse((72, y + 8, 82, y + 18), fill=MUTED)
    # SELECT highlighted in sentence
    prefix = ""
    # "SELECT: The SELECT clause specifies the columns you want to retrieve from a table"
    f = font(18)
    draw.text((96, y), "SELECT:", fill=SQL_BLUE, font=mono(18, bold=True))
    w1 = measure(draw, "SELECT:", mono(18, bold=True))[0]
    draw.text((100 + w1, y), " The ", fill=TEXT, font=f)
    w2 = measure(draw, " The ", f)[0]
    draw.text((100 + w1 + w2, y), "SELECT", fill=SQL_BLUE, font=mono(18, bold=True))
    w3 = measure(draw, "SELECT", mono(18, bold=True))[0]
    rest = " clause specifies the"
    draw.text((100 + w1 + w2 + w3, y), rest, fill=TEXT, font=f)
    draw.text((96, y + 28), "columns you want to retrieve from a table", fill=TEXT, font=f)
    draw_sql_block(draw, 780, y - 10, ["SELECT name", "FROM product", "WHERE price > 20;"])
    save(img, "slide-33-0774s.png")


def slide_34_36(name: str):
    img = canvas()
    draw = ImageDraw.Draw(img)
    draw.text((64, 48), "What you learned today", fill=TEXT, font=font(30, bold=True))
    draw.text((720, 48), "Up next", fill=TEXT, font=font(30, bold=True))

    y = 110
    items = [
        ("Relational database", ["Table", "Entity", "Primary keys"]),
        ("Relational database management systems (RDBMS)", ["Structured Query Language (SQL)"]),
        ("First taste of SQL", []),
    ]
    for title, kids in items:
        draw.ellipse((72, y + 8, 82, y + 18), fill=TEXT)
        draw.text((96, y), title, fill=TEXT, font=font(20, bold=True))
        y += 32
        for kid in kids:
            draw.ellipse((112, y + 8, 120, y + 16), outline=MUTED, width=2)
            draw.text((132, y), kid, fill=MUTED, font=font(18))
            y += 28
        y += 10

    draw.text((720, 110), "The basics of SQL", fill=TEXT, font=font(22))

    book_path = ROOT / "media" / "assets" / "book-clean.png"
    if book_path.exists():
        book = Image.open(book_path).convert("RGB")
        max_h = 420
        scale = min(1.0, max_h / book.height, 340 / book.width)
        book = book.resize(
            (int(book.width * scale), int(book.height * scale)),
            Image.Resampling.LANCZOS,
        )
        bx, by = 760, 170
        draw.rounded_rectangle(
            (bx - 8, by - 8, bx + book.width + 8, by + book.height + 8),
            radius=10,
            fill=PANEL,
            outline=PANEL_EDGE,
        )
        img.paste(book, (bx, by))
    save(img, name)


def reframe_screen_demo(src_name: str, out_name: str):
    """Keep original screen content pixels; drop gradient frame + presenter."""
    src = Image.open(SRC / src_name).convert("RGB")
    sw, sh = src.size
    left = int(sw * 0.055)
    top = int(sh * 0.045)
    right = int(sw * 0.945)
    bottom = int(sh * 0.92)
    content = src.crop((left, top, right, bottom))

    cw, ch = content.size
    # Cover webcam inset (bottom-right). Demo slides sit on white boards.
    cover_w, cover_h = int(cw * 0.28), int(ch * 0.32)
    # Sample a strip just above the inset for a seamless fill
    sy1 = max(0, ch - cover_h - 8)
    sy0 = max(0, sy1 - 24)
    sx0 = max(0, cw - cover_w)
    sample = content.crop((sx0, sy0, cw, sy1 if sy1 > sy0 else min(ch, sy0 + 1)))
    pixels = list(sample.getdata()) if sample.width and sample.height else []
    if pixels:
        r = sum(p[0] for p in pixels) // len(pixels)
        g = sum(p[1] for p in pixels) // len(pixels)
        b = sum(p[2] for p in pixels) // len(pixels)
        avg = (r, g, b)
    else:
        avg = (255, 255, 255)
    cover = Image.new("RGB", (cover_w, cover_h), avg)
    content.paste(cover, (cw - cover_w, ch - cover_h))

    img = canvas()
    max_w, max_h = W - 80, H - 80
    scale = min(max_w / content.width, max_h / content.height)
    nw, nh = int(content.width * scale), int(content.height * scale)
    content = content.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (W - nw) // 2
    oy = (H - nh) // 2
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        (ox - 8, oy - 8, ox + nw + 8, oy + nh + 8),
        radius=12,
        fill=PANEL,
        outline=PANEL_EDGE,
    )
    img.paste(content, (ox, oy))
    save(img, out_name)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing originals at {SRC}")

    slide_01()
    slide_02()
    slide_03()
    slide_title_only("slide-04-0030s.png", "Enter: The Relational Database", title_color=ACCENT)
    slide_05(False, "slide-05-0033s.png")
    slide_05(True, "slide-06-0040s.png")
    slide_07()
    slide_08()
    slide_09()
    slide_10()
    slide_11_12("slide-11-0175s.png")
    slide_11_12("slide-12-0201s.png")
    slide_bad_product("slide-13-0204s.png", False)
    slide_bad_product("slide-14-0242s.png", True)
    slide_15()
    slide_16_17("slide-16-0352s.png")
    slide_16_17("slide-17-0393s.png")
    slide_18()
    slide_19()
    slide_20()
    slide_21_31("slide-21-0431s.png")

    for n, ts in [
        (22, "0462"),
        (23, "0472"),
        (24, "0510"),
        (25, "0544"),
        (26, "0550"),
        (27, "0564"),
        (28, "0589"),
        (29, "0715"),
        (30, "0742"),
    ]:
        # filenames from deck
        pass

    # Screen demos — map by known filenames
    demos = [
        "slide-22-0443s.png",
        "slide-23-0462s.png",
        "slide-24-0472s.png",
        "slide-25-0510s.png",
        "slide-26-0544s.png",
        "slide-27-0550s.png",
        "slide-28-0564s.png",
        "slide-29-0589s.png",
        "slide-30-0715s.png",
    ]
    for demo in demos:
        reframe_screen_demo(demo, demo)

    slide_21_31("slide-31-0742s.png")
    slide_32()
    slide_33()
    slide_34_36("slide-34-0843s.png")
    slide_34_36("slide-35-0845s.png")
    slide_34_36("slide-36-0876s.png")
    print(f"Done. Wrote slides to {OUT}")


if __name__ == "__main__":
    main()
