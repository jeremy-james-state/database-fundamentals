#!/usr/bin/env python3
"""Render clean portrait lesson slides with exact original wording."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "media" / "slides-landscape"
DST = ROOT / "media" / "slides"

OUT_W, OUT_H = 900, 1000
BG = (20, 20, 20)
CARD = (248, 248, 248)
INK = (28, 28, 28)
MUTED = (90, 90, 90)
LINE = (55, 55, 55)
ACCENT = (140, 48, 52)
SQL = (55, 105, 145)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def mono(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/Library/Fonts/Menlo.ttc",
    ):
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return font(size)


def new_card() -> tuple[Image.Image, ImageDraw.ImageDraw, int, int]:
    canvas = Image.new("RGB", (OUT_W, OUT_H), BG)
    pad = 28
    card = Image.new("RGB", (OUT_W - pad * 2, OUT_H - pad * 2), CARD)
    canvas.paste(card, (pad, pad))
    draw = ImageDraw.Draw(canvas)
    return canvas, draw, pad, pad


def finish(canvas: Image.Image, name: str) -> None:
    DST.mkdir(parents=True, exist_ok=True)
    path = DST / name
    canvas.save(path, "PNG", optimize=True)
    print(f"wrote {name}")


def draw_table(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    headers: list[str],
    rows: list[list[str]],
    col_widths: list[int],
    highlights: list[tuple[int, int]] | None = None,
) -> int:
    x0, y0 = origin
    row_h = 52
    head_h = 48
    f_head = font(22, bold=True)
    f_cell = font(20)
    table_w = sum(col_widths)

    # Header
    x = x0
    for i, h in enumerate(headers):
        draw.text((x + 10, y0 + 12), h, fill=INK, font=f_head)
        x += col_widths[i]
    draw.line((x0, y0 + head_h, x0 + table_w, y0 + head_h), fill=LINE, width=2)
    draw.line((x0 + col_widths[0], y0, x0 + col_widths[0], y0 + head_h + row_h * len(rows)), fill=LINE, width=2)

    y = y0 + head_h
    for r_i, row in enumerate(rows):
        if highlights:
            for a, b in highlights:
                if a <= r_i <= b:
                    draw.rectangle(
                        (x0 + 2, y + 2, x0 + table_w - 2, y + row_h - 2),
                        outline=(180, 40, 45),
                        width=2,
                    )
                    break
        x = x0
        for c_i, cell in enumerate(row):
            color = MUTED if cell == "(missing)" else INK
            draw.text((x + 10, y + 14), cell, fill=color, font=f_cell)
            x += col_widths[c_i]
        y += row_h
    return y


def slide_01() -> None:
    canvas, draw, ox, oy = new_card()
    headers = ["#", "Name", "Email", "Phone"]
    rows = [
        ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567"],
        ["1", "Jordan Lee", "jordanl@email.com", "555-987-6543"],
        ["2", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
        ["3", "Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
    ]
    widths = [56, 190, 300, 190]
    table_h = 48 + 52 * len(rows)
    table_w = sum(widths)
    x = ox + (OUT_W - ox * 2 - table_w) // 2
    y = oy + (OUT_H - oy * 2 - table_h) // 2
    draw_table(draw, (x, y), headers, rows, widths)
    finish(canvas, "slide-01-0001s.png")


def slide_02() -> None:
    canvas, draw, ox, oy = new_card()
    headers = ["#", "Name", "Email", "Phone"]
    rows = [
        ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567"],
        ["1", "Jordan Lee", "jordan.lee@email.com", "(missing)"],
        ["2", "Jordan Lee", "jordanl@email.com", "555-987-6543"],
        ["3", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
        ["4", "Carlos Rivera", "(missing)", "555-234-1122"],
        ["5", "Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
    ]
    widths = [56, 190, 300, 190]
    table_h = 48 + 52 * len(rows)
    table_w = sum(widths)
    x = ox + (OUT_W - ox * 2 - table_w) // 2
    y = oy + (OUT_H - oy * 2 - table_h) // 2
    draw_table(draw, (x, y), headers, rows, widths, highlights=[(1, 2), (4, 5)])
    finish(canvas, "slide-02-0010s.png")


def slide_03() -> None:
    canvas, draw, ox, oy = new_card()
    headers = ["#", "Name", "Email", "Phone", "committee", "Paid?", "RSVP"]
    rows = [
        ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567", "", "✓", "?"],
        ["1", "Jordan Lee", "jordan.lee@email.com", "(missing)", "✓", "✓", "✓"],
        ["2", "Jordan Lee", "jordanl@email.com", "555-987-6543", "✗", "✓", "✗"],
        ["3", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890", "", "✓", ""],
        ["4", "Carlos Rivera", "(missing)", "555-234-1122", "✗", "", ""],
        ["5", "Carlos Rivera", "carlos.r@email.com", "555-234-1122", "✓", "", ""],
    ]
    # Compact columns for portrait
    widths = [40, 130, 200, 130, 90, 70, 70]
    f_small = font(16)
    f_head = font(15, bold=True)
    x0, y0 = ox + 24, oy + 40
    row_h, head_h = 44, 40
    table_w = sum(widths)
    x = x0
    for i, h in enumerate(headers):
        draw.text((x + 4, y0 + 10), h, fill=INK, font=f_head)
        x += widths[i]
    draw.line((x0, y0 + head_h, x0 + table_w, y0 + head_h), fill=LINE, width=2)
    draw.line((x0 + widths[0], y0, x0 + widths[0], y0 + head_h + row_h * len(rows)), fill=LINE, width=2)
    y = y0 + head_h
    for row in rows:
        x = x0
        for c_i, cell in enumerate(row):
            color = (170, 40, 45) if cell == "✗" else (MUTED if cell == "(missing)" else INK)
            draw.text((x + 4, y + 12), cell, fill=color, font=f_small)
            x += widths[c_i]
        y += row_h
    finish(canvas, "slide-03-0015s.png")


def title_slide(name: str, title: str, subtitle: str | None = None) -> None:
    canvas, draw, ox, oy = new_card()
    f_title = font(42, bold=True)
    # Word-wrap title
    max_w = OUT_W - ox * 2 - 80
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f_title) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    total_h = len(lines) * 56 + (40 if subtitle else 0)
    y = oy + (OUT_H - ox * 2 - total_h) // 2
    for line in lines:
        draw.text((ox + 40, y), line, fill=ACCENT, font=f_title)
        y += 56
    if subtitle:
        draw.text((ox + 40, y + 12), subtitle, fill=MUTED, font=font(24))
    finish(canvas, name)


def bullets(name: str, title: str, items: list[tuple[str, int]]) -> None:
    canvas, draw, ox, oy = new_card()
    draw.text((ox + 40, oy + 48), title, fill=INK, font=font(36, bold=True))
    y = oy + 120
    for text, level in items:
        indent = 40 + level * 28
        bullet = "•" if level == 0 else "◦"
        draw.text((ox + indent, y), f"{bullet}  {text}", fill=INK, font=font(24 if level == 0 else 22))
        y += 44 if level == 0 else 38
    finish(canvas, name)


def body_slide(name: str, eyebrow: str, title: str, paragraphs: list[str], bullets_list: list[str] | None = None) -> None:
    canvas, draw, ox, oy = new_card()
    draw.text((ox + 40, oy + 40), eyebrow, fill=MUTED, font=font(18))
    draw.text((ox + 40, oy + 72), title, fill=INK, font=font(30, bold=True))
    y = oy + 130
    f = font(22)
    max_w = OUT_W - ox * 2 - 80
    for para in paragraphs:
        words = para.split()
        cur = ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if draw.textlength(trial, font=f) <= max_w:
                cur = trial
            else:
                draw.text((ox + 40, y), cur, fill=INK, font=f)
                y += 34
                cur = w
        if cur:
            draw.text((ox + 40, y), cur, fill=INK, font=f)
            y += 42
    if bullets_list:
        y += 8
        for item in bullets_list:
            # wrap bullet
            prefix = "•  "
            words = item.split()
            cur = ""
            first = True
            for w in words:
                trial = f"{cur} {w}".strip()
                line = (prefix if first else "   ") + trial
                if draw.textlength(line, font=f) <= max_w:
                    cur = trial
                else:
                    draw.text((ox + 40, y), (prefix if first else "   ") + cur, fill=INK, font=f)
                    y += 32
                    cur = w
                    first = False
            if cur:
                draw.text((ox + 40, y), (prefix if first else "   ") + cur, fill=INK, font=f)
                y += 38
    finish(canvas, name)


def sql_slide(name: str, title: str, prompt: str | None, sql: str, note: str | None = None) -> None:
    canvas, draw, ox, oy = new_card()
    draw.text((ox + 40, oy + 40), title, fill=INK, font=font(30, bold=True))
    y = oy + 100
    if prompt:
        f = font(22)
        max_w = OUT_W - ox * 2 - 80
        words = prompt.split()
        cur = ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if draw.textlength(trial, font=f) <= max_w:
                cur = trial
            else:
                draw.text((ox + 40, y), cur, fill=INK, font=f)
                y += 32
                cur = w
        if cur:
            draw.text((ox + 40, y), cur, fill=INK, font=f)
            y += 48
    # SQL card
    lines = sql.strip("\n").split("\n")
    box_h = 28 + len(lines) * 36
    draw.rounded_rectangle((ox + 36, y, OUT_W - ox - 36, y + box_h), radius=12, fill=(235, 240, 245))
    fm = mono(24)
    sy = y + 18
    for line in lines:
        draw.text((ox + 56, sy), line, fill=SQL, font=fm)
        sy += 36
    y = y + box_h + 28
    if note:
        draw.text((ox + 40, y), note, fill=MUTED, font=font(22))
    finish(canvas, name)


def two_col_summary(name: str) -> None:
    canvas, draw, ox, oy = new_card()
    draw.text((ox + 40, oy + 48), "What you learned today", fill=INK, font=font(28, bold=True))
    draw.text((ox + 40, oy + 100), "•  Relational database", fill=INK, font=font(22))
    for t in ("Table", "Entity", "Primary keys"):
        draw.text((ox + 68, oy + 100 + 34 * (["Table", "Entity", "Primary keys"].index(t) + 1)), f"◦  {t}", fill=INK, font=font(20))
    y = oy + 250
    draw.text((ox + 40, y), "•  Relational database management", fill=INK, font=font(22))
    draw.text((ox + 40, y + 34), "   systems (RDBMS)", fill=INK, font=font(22))
    draw.text((ox + 68, y + 70), "◦  Structured Query Language (SQL)", fill=INK, font=font(20))
    draw.text((ox + 40, y + 120), "•  First taste of SQL", fill=INK, font=font(22))

    draw.text((ox + 40, oy + 480), "Up next", fill=INK, font=font(28, bold=True))
    draw.text((ox + 40, oy + 532), "The basics of SQL", fill=MUTED, font=font(24))
    finish(canvas, name)


def composite_from_landscape(name: str) -> None:
    """Fallback: crop landscape capture into portrait card (for screen demos)."""
    src = SRC / name
    if not src.exists():
        print(f"skip missing {name}")
        return
    img = Image.open(src).convert("RGB")
    w, h = img.size
    # Prefer center content, drop bottom-right presenter
    board = img.crop((int(w * 0.08), int(h * 0.08), int(w * 0.92), int(h * 0.92)))
    draw = ImageDraw.Draw(board)
    draw.rectangle((int(board.width * 0.68), int(board.height * 0.48), board.width, board.height), fill=CARD)
    # Content bbox
    gray = board.convert("L")
    mask = gray.point(lambda p: 255 if p < 228 else 0).filter(ImageFilter.MaxFilter(5))
    bbox = mask.getbbox() or (0, 0, board.width, board.height)
    content = board.crop(bbox)
    canvas = Image.new("RGB", (OUT_W, OUT_H), BG)
    pad = 28
    card = Image.new("RGB", (OUT_W - pad * 2, OUT_H - pad * 2), CARD)
    inner = (card.width - 48, card.height - 48)
    fitted = ImageOps.contain(content, inner, Image.Resampling.LANCZOS)
    card.paste(fitted, ((card.width - fitted.width) // 2, (card.height - fitted.height) // 2))
    canvas.paste(card, (pad, pad))
    finish(canvas, name)


def main() -> None:
    slide_01()
    slide_02()
    slide_03()
    title_slide("slide-04-0030s.png", "Enter: The Relational Database")
    title_slide("slide-05-0033s.png", "Enter: The Relational Database")
    title_slide("slide-06-0040s.png", "Enter: The Relational Database")
    bullets(
        "slide-07-0047s.png",
        "Topic List",
        [
            ("Relational database", 0),
            ("Table", 1),
            ("Entity", 1),
            ("Primary keys", 1),
            ("Relational database management systems (RDBMS)", 0),
            ("Structured Query Language (SQL)", 1),
            ("First taste of SQL", 0),
        ],
    )
    body_slide(
        "slide-08-0057s.png",
        "Relational database",
        "What are relational databases and tables?",
        [],
    )
    body_slide(
        "slide-09-0091s.png",
        "Relational database",
        "What are relational databases and tables?",
        [
            "A relational database is collection of tables.",
            "A table is:",
        ],
        [
            "like a spreadsheet where data is organized into rows and columns",
            "used to represent an entity or a relationship between entities",
        ],
    )
    body_slide("slide-10-0098s.png", "Relational database", "What is an entity?", [])
    body_slide(
        "slide-11-0175s.png",
        "Relational database",
        "A table is not the same as a spreadsheet",
        [],
    )
    body_slide(
        "slide-12-0201s.png",
        "Relational database",
        "A table is not the same as a spreadsheet",
        [],
    )
    # Bad product table slides — keep exact column intent via compact table
    for name in ("slide-13-0204s.png", "slide-14-0242s.png"):
        canvas, draw, ox, oy = new_card()
        draw.text((ox + 36, oy + 36), "Relational database", fill=MUTED, font=font(18))
        draw.text((ox + 36, oy + 66), "A table is not the same as a spreadsheet", fill=INK, font=font(26, bold=True))
        draw.text((ox + 36, oy + 110), "•  A “bad” product table", fill=INK, font=font(22))
        headers = ["product_id", "name", "price", "manufacturer", "customer_id", "customer_name", "customer_email", "quantity"]
        rows = [
            ["1", "Atomic Nose …", "14.44", "Mad Inventors Inc.", "a1", "Bob", "bob@gmail.com", "5"],
            ["2", "Selfie Toaster", "24.29", "Goofy Gadgets Corp.", "b2", "Dave", "dave@evtlock.com", "15"],
            ["3", "Cat-Poop Coffee", "20.01", "Absurd Accessories", "a1", "Bob", "bob@gmail.com", "8"],
            ["4", "The Infinite…", "49.44", "Silly Supplies Co.", "c3", "John", "john@ld3.net", "1"],
            ["10", "The Neuralyzer", "33.55", "Silly Supplies Co.", "d4", "Kory", "kory@ld3.net", "2"],
        ]
        # Stacked card rows for portrait instead of unreadable 8-col table
        y = oy + 160
        f = font(16)
        for row in rows:
            box = (ox + 36, y, OUT_W - ox - 36, y + 96)
            draw.rounded_rectangle(box, radius=10, fill=(238, 238, 238))
            draw.text((ox + 52, y + 12), f"{row[0]}  {row[1]}   ${row[2]}", fill=INK, font=font(18, bold=True))
            draw.text((ox + 52, y + 40), f"{row[3]}", fill=MUTED, font=f)
            draw.text((ox + 52, y + 64), f"customer {row[4]}  {row[5]}  {row[6]}  qty {row[7]}", fill=MUTED, font=f)
            y += 108
        # tiny header reminder of original columns
        draw.text((ox + 36, OUT_H - ox - 48), " · ".join(headers), fill=(150, 150, 150), font=font(11))
        finish(canvas, name)

    body_slide(
        "slide-15-0262s.png",
        "Relational database management systems",
        "What's a relational database management systems (RDBMS)?",
        [],
    )
    body_slide(
        "slide-16-0352s.png",
        "Relational database management systems",
        "What's a relational database management systems (RDBMS)?",
        ["An RDBMS is software that:"],
        [
            "interacts with the underlying hardware and operating system to physically store and manage data in relational databases",
            "Some common RDBMS — MySQL, MariaDB, PostgreSQL, and SQLite",
            "provides tools and functions to manage databases",
            "SQL: a programming language that you can use to create, modify, and query data stored in tables in an RDBMS",
        ],
    )
    body_slide(
        "slide-17-0393s.png",
        "Relational database management systems",
        "What's a relational database management systems (RDBMS)?",
        ["An RDBMS is software that:"],
        [
            "interacts with the underlying hardware and operating system to physically store and manage data in relational databases",
            "Some common RDBMS — MySQL, MariaDB, PostgreSQL, and SQLite",
            "provides tools and functions to manage databases",
            "SQL: a programming language that you can use to create, modify, and query data stored in tables in an RDBMS",
        ],
    )
    title_slide("slide-18-0402s.png", "First taste of SQL")
    body_slide(
        "slide-19-0421s.png",
        "First taste of SQL",
        "The product table from The Sci-Fi Collective database:",
        [],
    )
    # Product list for 19/20
    # Exact columns/rows from lecture slide (description shown as …)
    products = [
        ("1", "Atomic Nose Hair Trimmer", "…", "19.99", "Mad Inventors Inc."),
        ("2", "Selfie Toaster", "…", "24.99", "Goofy Gadgets Corp."),
        ("3", "Cat-Poop Coffee", "…", "29.99", "Absurd Accessories"),
        ("9", "The Infinite Improbability Generator", "…", "9.99", "Silly Supplies Co."),
        ("10", "The Neuralyzer", "…", "33.55", "Silly Supplies Co."),
    ]
    for name, with_q in (("slide-19-0421s.png", False), ("slide-20-0423s.png", True)):
        canvas, draw, ox, oy = new_card()
        draw.text((ox + 36, oy + 36), "First taste of SQL", fill=INK, font=font(28, bold=True))
        y = oy + 88
        if with_q:
            prompt = "How do we get the product names from the product table whose price is above $20?"
            f = font(20)
            max_w = OUT_W - ox * 2 - 72
            words = prompt.split()
            cur = ""
            for w in words:
                trial = f"{cur} {w}".strip()
                if draw.textlength(trial, font=f) <= max_w:
                    cur = trial
                else:
                    draw.text((ox + 36, y), cur, fill=INK, font=f)
                    y += 30
                    cur = w
            if cur:
                draw.text((ox + 36, y), cur, fill=INK, font=f)
                y += 40
        else:
            draw.text((ox + 36, y), "The product table from The Sci-Fi Collective database:", fill=MUTED, font=font(18))
            y += 28
            draw.text((ox + 36, y), "product_id · name · description · price · manufacturer", fill=(150, 150, 150), font=font(14))
            y += 36
        for pid, pname, desc, price, mfr in products:
            draw.rounded_rectangle((ox + 36, y, OUT_W - ox - 36, y + 78), radius=10, fill=(238, 238, 238))
            draw.text((ox + 52, y + 12), f"{pid}  {pname}", fill=INK, font=font(18, bold=True))
            draw.text((ox + 52, y + 42), f"desc {desc}   ${price}   {mfr}", fill=MUTED, font=font(15))
            y += 90
        finish(canvas, name)

    sql_slide(
        "slide-21-0431s.png",
        "First taste of SQL",
        "How do we get the product names from the product table whose price is above $20?",
        "SELECT name\nFROM product\nWHERE price > 20;",
    )
    # Screen demos stay as composites
    for n in range(22, 31):
        # filenames vary — glob
        pass
    for path in sorted(SRC.glob("slide-2[2-9]-*.png")) + sorted(SRC.glob("slide-30-*.png")):
        composite_from_landscape(path.name)

    sql_slide(
        "slide-31-0742s.png",
        "First taste of SQL",
        "How do we get the product names from the product table whose price is above $20?",
        "SELECT name\nFROM product\nWHERE price > 20;",
    )
    sql_slide(
        "slide-32-0746s.png",
        "First taste of SQL",
        None,
        "SELECT name\nFROM product\nWHERE price > 20;",
        "SQL is like English, with little to no small talk.",
    )
    canvas, draw, ox, oy = new_card()
    draw.text((ox + 36, oy + 40), "First taste of SQL", fill=INK, font=font(28, bold=True))
    draw.text((ox + 36, oy + 90), "SQL is like English, with little to no small talk.", fill=MUTED, font=font(20))
    draw.text((ox + 36, oy + 140), "Three SQL clauses:", fill=INK, font=font(24, bold=True))
    draw.text((ox + 36, oy + 190), "•  SELECT: The SELECT clause specifies the", fill=INK, font=font(20))
    draw.text((ox + 60, oy + 222), "columns you want to retrieve from a table", fill=INK, font=font(20))
    draw.rounded_rectangle((ox + 36, oy + 280, OUT_W - ox - 36, oy + 420), radius=12, fill=(235, 240, 245))
    for i, line in enumerate(["SELECT name", "FROM product", "WHERE price > 20;"]):
        draw.text((ox + 56, oy + 300 + i * 36), line, fill=SQL, font=mono(24))
    finish(canvas, "slide-33-0774s.png")

    for name in ("slide-34-0843s.png", "slide-35-0845s.png", "slide-36-0876s.png"):
        two_col_summary(name)

    print("done")


if __name__ == "__main__":
    main()
