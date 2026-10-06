/** Lyric-synced animated scenes — visuals lead; text on the right narrates.
 * Author beats in audio/authoring/lesson-flow.js (CLI). Do not import that file
 * from the player — serve root is audio/player/, so ../authoring 404s and
 * the module graph never runs (empty lyrics, dead chevrons).
 */

const MEMBERS = [
  ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567"],
  ["1", "Jordan Lee", "jordanl@email.com", "555-987-6543"],
  ["2", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
  ["3", "Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
];

const MEMBERS_MESSY = [
  ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567"],
  ["1", "Jordan Lee", "jordan.lee@email.com", "(missing)"],
  ["2", "Jordan Lee", "jordanl@email.com", "555-987-6543"],
  ["3", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890"],
  ["4", "Carlos Rivera", "(missing)", "555-234-1122"],
  ["5", "Carlos Rivera", "carlos.r@email.com", "555-234-1122"],
];

const MESSY_META = [
  { dup: false, missing: false },
  { dup: true, missing: true },
  { dup: true, missing: false },
  { dup: false, missing: false },
  { dup: true, missing: true },
  { dup: true, missing: false },
];

const PRODUCTS = [
  ["1", "Atomic Nose Hair Trimmer", "19.99", "Mad Inventors Inc."],
  ["2", "Selfie Toaster", "24.99", "Goofy Gadgets Corp."],
  ["3", "Cat-Poop Coffee", "29.99", "Absurd Accessories"],
  ["9", "The Infinite Improbability Generator", "9.99", "Silly Supplies Co."],
  ["10", "The Neuralyzer", "33.55", "Silly Supplies Co."],
];

/**
 * Rhythm rule: a beat reveals ONLY when that lyric is active.
 * Prefer diagrams/structure over repeating spoken sentences.
 */
export const SCENES = [
  {
    id: "members",
    fromLyric: 0,
    toLyric: 3,
    kind: "table",
    sceneIntent: "club-table",
    headers: ["#", "Name", "Email", "Phone"],
    rows: MEMBERS,
    steps: [
      { lyricMin: 0, actions: ["enter"] },
      { lyricMin: 1, actions: ["show-header", "reveal-rows"] },
      /* Intra-lyric: one spoken list — names → emails → phone numbers */
      { lyricMin: 1, lyricMax: 1, timeMin: 6.12, actions: ["pulse-col:1"] },
      { lyricMin: 1, lyricMax: 1, timeMin: 6.63, actions: ["pulse-col:2"] },
      { lyricMin: 1, lyricMax: 1, timeMin: 7.49, actions: ["pulse-col:3"] },
      { lyricMin: 2, actions: ["unease"] },
    ],
  },
  {
    id: "messy",
    fromLyric: 3,
    toLyric: 5,
    kind: "table",
    sceneIntent: "duplicates",
    headers: ["#", "Name", "Email", "Phone"],
    rows: MEMBERS_MESSY,
    rowMeta: MESSY_META,
    steps: [
      { lyricMin: 3, actions: ["enter", "show-header", "reveal-rows"] },
      { lyricMin: 3, timeMin: 11.25, actions: ["highlight-dups"] },
      { lyricMin: 4, actions: ["missing"] },
    ],
  },
  {
    id: "chaos",
    fromLyric: 5,
    toLyric: 8,
    kind: "chaos",
    sceneIntent: "chaos",
    headers: ["#", "Name", "Email", "Phone", "committee", "Paid?", "RSVP"],
    rows: [
      ["0", "Maya Patel", "maya.patel@email.com", "555-123-4567", "", "✓", "?"],
      ["1", "Jordan Lee", "jordan.lee@email.com", "(missing)", "✓", "✓", "✓"],
      ["2", "Jordan Lee", "jordanl@email.com", "555-987-6543", "✗", "✓", "✗"],
      ["3", "Sofia Nguyen", "sofia.n@email.com", "555-456-7890", "", "✓", ""],
      ["4", "Carlos Rivera", "(missing)", "555-234-1122", "✗", "", ""],
      ["5", "Carlos Rivera", "carlos.r@email.com", "555-234-1122", "✓", "", ""],
    ],
    steps: [
      { lyricMin: 5, actions: ["enter", "show-header", "reveal-rows", "chaos", "missing"] },
      /* Intra-lyric: payments → committees → event RSVPs */
      { lyricMin: 5, lyricMax: 5, timeMin: 17.4, actions: ["pulse-col:5"] },
      { lyricMin: 5, lyricMax: 5, timeMin: 18.14, actions: ["pulse-col:4"] },
      { lyricMin: 5, lyricMax: 5, timeMin: 19.32, actions: ["pulse-col:6"] },
      { lyricMin: 6, actions: ["pulse"] },
      { lyricMin: 7, actions: ["structure-hint"] },
    ],
  },
  {
    id: "enter-db",
    fromLyric: 20,
    toLyric: 62,
    kind: "schema",
    sceneIntent: "schema",
    title: "A collection of related tables",
    /* Original slide-06 hub story — FK badges + link captions (no SVG trees) */
    tables: [
      { id: "users", label: "users", cols: ["email", "id", "password"], pk: "id", hub: true },
      { id: "products", label: "products", cols: ["product_id", "product_name"], pk: "product_id" },
      {
        id: "reviews",
        label: "reviews",
        cols: ["review_id", "text", "time", "email", "product_id"],
        pk: "review_id",
        fks: { email: "users.email", product_id: "products.product_id" },
      },
      { id: "states", label: "states", cols: ["state_id", "state"], pk: "state_id" },
      {
        id: "addresses",
        label: "addresses",
        cols: ["address_id", "street", "city", "postal_code", "user_id", "state_id"],
        pk: "address_id",
        fks: { user_id: "users.id", state_id: "states.state_id" },
      },
    ],
    links: [
      {
        from: "reviews.email",
        via: "who wrote it",
        to: "users.email",
        hue: "users",
        tables: ["reviews", "users"],
        pairs: ["reviews.email", "users.email"],
      },
      {
        from: "reviews.product_id",
        via: "which item",
        to: "products.product_id",
        hue: "products",
        tables: ["reviews", "products"],
        pairs: ["reviews.product_id", "products.product_id"],
      },
      {
        from: "addresses.user_id",
        via: "whose place",
        to: "users.id · states",
        hue: "states",
        tables: ["addresses", "users", "states"],
        pairs: ["addresses.user_id", "users.id", "addresses.state_id", "states.state_id"],
      },
    ],
    apps: [],
    steps: [
      { lyricMin: 20, actions: ["enter", "show-title", "show-schema"] },
      { lyricMin: 25, actions: ["show-table:users", "show-hub"] },
      { lyricMin: 31, actions: ["show-table:products"] },
      { lyricMin: 37, actions: ["show-table:reviews"] },
      { lyricMin: 39, actions: ["show-fk"] },
      { lyricMin: 40, lyricMax: 44, actions: ["show-link:0"] },
      { lyricMin: 45, lyricMax: 48, actions: ["show-link:1"] },
      { lyricMin: 49, actions: ["show-table:states"] },
      { lyricMin: 51, actions: ["show-table:addresses"] },
      { lyricMin: 53, lyricMax: 56, actions: ["show-link:2"] },
      { lyricMin: 61, actions: ["focus-products"] },
    ],
  },
  {
    /* Spoken questions only — no numbered syllabus (voice never lists it) */
    id: "topics",
    fromLyric: 8,
    toLyric: 20,
    kind: "roadmap",
    sceneIntent: "questions",
    title: "",
    questions: [
      "So what is a database, really?",
      "Why do we use tables?",
      "What’s a primary key?",
      "Why does almost every app run on an RDBMS?",
    ],
    answers: [
      "Structure: tables, not one giant sheet.",
      "Each table holds one kind of thing, in rows and columns.",
      "Uniquely identifies a row — this row, nowhere else.",
      "The software that stores that world. SQL is how you talk to it.",
    ],
    sections: [],
    steps: [
      { lyricMin: 8, actions: ["enter"] },
      { lyricMin: 9, actions: ["q:0"] },
      { lyricMin: 10, actions: ["q:1"] },
      { lyricMin: 11, actions: ["q:2"] },
      { lyricMin: 12, actions: ["q:3"] },
      { lyricMin: 14, actions: ["a:0"] },
      { lyricMin: 15, actions: ["a:1"] },
      { lyricMin: 16, actions: ["a:2"] },
      { lyricMin: 17, actions: ["a:3"] },
    ],
  },
  {
    id: "what-is",
    fromLyric: 62,
    toLyric: 64,
    kind: "one-table",
    sceneIntent: "table",
    steps: [
      { lyricMin: 62, actions: ["enter", "show-grid"] },
      { lyricMin: 63, actions: ["show-entity-label"] },
    ],
  },
  {
    id: "entity-intro",
    fromLyric: 64,
    toLyric: 68,
    kind: "entity-chips",
    sceneIntent: "entity",
    steps: [
      { lyricMin: 64, actions: ["enter", "show-question"] },
      { lyricMin: 65, actions: ["chip:product", "chip:customer", "chip:order", "hint-attrs"] },
    ],
  },
  {
    /* Original teaching slide: Entity → Attributes → table + PK / column / row */
    id: "product-teach",
    fromLyric: 68,
    toLyric: 74,
    kind: "product-teach",
    sceneIntent: "teach",
    steps: [
      { lyricMin: 68, actions: ["enter", "show-entity-label", "show-entity"] },
      {
        lyricMin: 69,
        actions: [
          "show-attrs-label",
          "attr:name",
          "attr:description",
          "attr:price",
          "attr:manufacturer",
        ],
      },
      { lyricMin: 70, lyricMax: 70, actions: ["show-table", "callout-column"] },
      { lyricMin: 70, lyricMax: 70, timeMin: 238.9, actions: ["show-rows", "callout-row"] },
      { lyricMin: 71, actions: ["show-table", "show-rows", "show-pk-col", "callout-pk"] },
      { lyricMin: 73, actions: ["key-glow"] },
    ],
  },
  {
    id: "bad-table",
    fromLyric: 74,
    toLyric: 86,
    kind: "bad-grid",
    sceneIntent: "anomalies",
    eyebrow: "One table, two entities",
    title: "Products + customers in one table",
    subtitle: "",
    headers: [
      "id",
      "name",
      "price",
      "cust_id",
      "customer",
      "email",
    ],
    rows: [
      ["1", "Atomic Nose Hair Trimmer", "19.99", "a1", "Bob", "bob@gmail.com"],
      ["2", "Selfie Toaster", "24.99", "b2", "Dave", "dave@evtlock.com"],
      ["3", "Cat-Poop Coffee", "29.99", "a1", "Bob", "bob@gmail.com"],
      ["10", "The Neuralyzer", "33.55", "d4", "Kory", "kory@ld3.net"],
    ],
    rowMeta: [
      { customer: "Bob", dup: true },
      { customer: "Dave", dup: false },
      { customer: "Bob", dup: true },
      { customer: "Kory", dup: false },
    ],
    steps: [
      { lyricMin: 74, actions: ["enter", "show-title"] },
      { lyricMin: 76, actions: ["reveal-grid"] },
      { lyricMin: 78, lyricMax: 78, actions: ["redundancy"] },
      { lyricMin: 79, lyricMax: 80, actions: ["anomaly"] },
      { lyricMin: 81, lyricMax: 82, actions: ["insertion"] },
      { lyricMin: 83, actions: ["punchline"] },
    ],
  },
  {
    id: "rdbms",
    fromLyric: 86,
    toLyric: 96,
    kind: "rdbms",
    steps: [
      { lyricMin: 86, actions: ["enter", "show-cylinder"] },
      { lyricMin: 87, actions: ["vendor:0", "vendor:1", "vendor:2", "vendor:3", "vendor:4"] },
      { lyricMin: 89, actions: ["show-sql-layer"] },
    ],
  },
  {
    id: "sql-taste",
    fromLyric: 96,
    toLyric: 107,
    kind: "sql",
    title: "First taste of SQL",
    prompt: "Products priced above $20",
    sql: ["SELECT name", "FROM product", "WHERE price > 20;"],
    products: PRODUCTS,
    steps: [
      { lyricMin: 96, actions: ["enter"] },
      { lyricMin: 97, actions: ["show-products"] },
      { lyricMin: 98, actions: ["show-prompt"] },
      { lyricMin: 100, actions: ["sql-line:0", "sql-line:1", "sql-line:2"] },
      { lyricMin: 102, actions: ["results"] },
    ],
  },
  {
    id: "sql-english",
    fromLyric: 107,
    toLyric: 116,
    kind: "sql",
    title: "First taste of SQL",
    prompt: "SQL is like English — without the small talk.",
    sql: ["SELECT name", "FROM product", "WHERE price > 20;"],
    clauses: [
      { name: "SELECT", text: "columns" },
      { name: "FROM", text: "table" },
      { name: "WHERE", text: "rows" },
    ],
    steps: [
      { lyricMin: 107, actions: ["enter", "show-prompt"] },
      { lyricMin: 108, actions: ["sql-line:0", "clause:0"] },
      { lyricMin: 109, actions: ["sql-line:1", "clause:1"] },
      { lyricMin: 110, actions: ["sql-line:2", "clause:2"] },
    ],
  },
  {
    id: "recap",
    fromLyric: 116,
    toLyric: 999,
    kind: "map",
    title: "How the pieces connect",
    nodes: [
      { id: "rdb", label: "Tables · entities · keys", sub: "how data is organized" },
      { id: "rdbms", label: "RDBMS", sub: "software that stores & manages it" },
      { id: "sql", label: "SQL", sub: "the language you use to ask" },
    ],
    next: "Next: building blocks of SQL",
    steps: [
      { lyricMin: 116, actions: ["enter", "show-title"] },
      { lyricMin: 118, actions: ["node:rdb"] },
      { lyricMin: 119, actions: ["node:rdbms", "arrow:0", "node:sql", "arrow:1"] },
      { lyricMin: 121, actions: ["next"] },
    ],
  },
];

/** Short filmstrip labels — one chapter per major scene beat. */
const CHAPTER_LABELS = {
  members: "Club members",
  messy: "Duplicates",
  chaos: "Spreadsheet chaos",
  "enter-db": "Relational database",
  topics: "Questions",
  "what-is": "One table, one job",
  "entity-intro": "What is an entity?",
  "product-teach": "Entity → table",
  "bad-table": "Bad table",
  rdbms: "RDBMS",
  "sql-taste": "First SQL",
  "sql-english": "SQL clauses",
  recap: "Recap",
};

/**
 * Build clickable chapters from SCENES + lyric start times.
 * @param {{ start: number }[]} lyrics
 */
export function buildChapters(lyrics = []) {
  return SCENES.map((scene, i) => {
    const line = lyrics[scene.fromLyric];
    return {
      id: scene.id,
      kind: scene.kind,
      label: CHAPTER_LABELS[scene.id] || scene.title || scene.id,
      fromLyric: scene.fromLyric,
      toLyric: scene.toLyric,
      start: line && Number.isFinite(line.start) ? line.start : 0,
      index: i,
    };
  });
}

export function sceneAtLyric(lyricIndex) {
  const idx = Math.max(0, lyricIndex);
  for (const scene of SCENES) {
    if (idx >= scene.fromLyric && idx < scene.toLyric) return scene;
  }
  return SCENES[SCENES.length - 1];
}

export function activeActions(scene, lyricIndex, time = 0) {
  const actions = new Set();
  for (const step of scene.steps || []) {
    const lyricOk =
      (step.lyricMin == null || lyricIndex >= step.lyricMin) &&
      (step.lyricMax == null || lyricIndex <= step.lyricMax);
    const timeOk = step.timeMin == null || time >= step.timeMin;
    if (lyricOk && timeOk) {
      for (const a of step.actions) actions.add(a);
    }
  }
  return actions;
}
