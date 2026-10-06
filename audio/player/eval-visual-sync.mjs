#!/usr/bin/env node
/**
 * Heuristic visual↔lyric sync report (pass/warn).
 * Not a pixel-perfect scorer — flags confusing mismatches.
 *
 *   node audio/player/eval-visual-sync.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, sceneAtLyric, activeActions } from "./visual-stage.js";

const dir = dirname(fileURLToPath(import.meta.url));
const cues = JSON.parse(readFileSync(join(dir, "media/cues.json"), "utf8"));
const lyrics = cues.lyrics || [];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lyricFlags(text) {
  const t = norm(text);
  return {
    asksDatabase: /what is a database/.test(t),
    asksTables: /why do we use tables|why tables/.test(t),
    asksPk: /what'?s a primary key|primary key\?/.test(t) && /what/.test(t),
    mentionsPk: /primary key|product id/.test(t),
    asksRdbms: /rdbms/.test(t) && /why|what|called/.test(t),
    mentionsRdbms: /rdbms|relational database management/.test(t),
    unpack: /unpack all of that|first line of sql/.test(t),
    collectionOfTables: /collection of (related )?tables/.test(t),
    schemaWalk: /first: users|now products|reviews live|reviews\.email|product_id matches|tiny lookup|addresses hang|related tables/.test(t),
    tableLook: /table looks|spreadsheet|rows and columns|junk drawer/.test(t),
    oneJob: /one table has one job|single entity/.test(t),
    asksEntity: /what'?s an entity/.test(t),
    definesEntity: /thing you can describe/.test(t),
    columnRow: /become the columns|becomes a row/.test(t),
    duplicate: /added twice|duplicate/.test(t),
    missing: /overwritten|missing/.test(t),
    extraCols: /payments|committees|rsvps/.test(t),
    structure: /you need structure/.test(t),
    oneTableEntity: /one table\.|one entity/.test(t) || /^one table/.test(t),
    sqlTaste: /\bselect\b|\bfrom\b|\bwhere\b|sql is like/.test(t),
    recap: /pieces connect|building blocks/.test(t),
    questionRun: /what is a database|why do we use tables|what'?s a primary key|why does almost every app/.test(t),
  };
}

const INTENT_OK = {
  questions: (f) => f.questionRun || f.unpack || f.asksDatabase || f.asksTables || f.asksPk || f.asksRdbms,
  schema: (f) => f.collectionOfTables || /relational database is/.test(norm("")),
  table: (f) => f.tableLook || f.oneJob,
  entity: (f) => f.asksEntity || f.definesEntity,
  teach: (f) => f.columnRow || f.mentionsPk || /each product is an entity|name, a description/.test(""),
  punchline: (f) => f.structure || f.asksEntity || f.oneTableEntity,
};

const findings = [];

function flag(level, lyricIndex, code, detail) {
  findings.push({ level, lyricIndex, code, detail });
}

for (const scene of SCENES) {
  if (scene.fromLyric >= scene.toLyric) {
    flag("warn", scene.fromLyric, "empty-range", `${scene.id} fromLyric >= toLyric`);
  }
}

for (let i = 0; i < lyrics.length; i++) {
  const line = lyrics[i];
  const text = line.text || "";
  const t = norm(text);
  const f = lyricFlags(text);
  const scene = sceneAtLyric(i);
  const tMid = (Number(line.start) + Number(line.end)) / 2;
  const actions = [...activeActions(scene, i, tMid)];
  const intent = scene.sceneIntent || scene.kind;
  const actionStr = actions.join(", ");

  if (f.questionRun && (scene.kind === "schema" || intent === "schema")) {
    flag(
      "fail",
      i,
      "qs-vs-schema",
      `Question lyric on schema scene "${scene.id}". Show a questions checklist, not a schema.`
    );
  }

  if (f.questionRun && (actions.some((a) => a.startsWith("section:") || a.startsWith("item:")) || intent === "outline")) {
    flag(
      "fail",
      i,
      "qs-vs-outline",
      `Question lyric showing numbered outline (${actionStr || intent}). Reveal spoken questions only.`
    );
  }

  if ((f.asksDatabase || f.asksTables || f.asksPk || f.asksRdbms) && intent !== "questions") {
    flag(
      "fail",
      i,
      "qs-wrong-scene",
      `Spoken question but sceneIntent="${intent}" (${scene.id} / ${scene.kind}).`
    );
  }

  if (intent === "outline" && !f.unpack && !/table|entity|primary key|rdbms|sql/.test(t)) {
    flag("warn", i, "outline-unspoken", `Outline scene while lyric doesn't list agenda items: “${text.slice(0, 80)}”`);
  }

  if (intent === "outline" && (f.questionRun || f.asksDatabase || f.asksTables || f.asksPk || f.asksRdbms)) {
    flag("fail", i, "outline-on-questions", `Numbered outline during Q lyric: “${text.slice(0, 72)}”`);
  }

  if (actions.includes("ask-entity") && !f.asksEntity) {
    flag("fail", i, "entity-on-table", `ask-entity on “${text.slice(0, 72)}” — don't stack entity? on the table beat.`);
  }

  if (scene.kind === "one-table" && f.asksEntity) {
    flag(
      "warn",
      i,
      "entity-q-on-table-scene",
      `“What's an entity?” still on one-table scene. Prefer frost punchline then chips — not table + giant entity?.`
    );
  }

  if (actions.includes("structure-hint") || actions.includes("punchline")) {
    const ok = f.structure || f.asksEntity || f.oneTableEntity || /you need structure|what'?s an entity|one entity/.test(t);
    if (!ok && i < 37) {
      flag("fail", i, "punchline-early", `Punchline/frost on lyric that isn't a story turn: “${text.slice(0, 72)}”`);
    }
  }

  if (actions.includes("highlight-dups") && !f.duplicate && i < 3) {
    flag("fail", i, "dups-early", `highlight-dups before “added twice”: “${text.slice(0, 72)}”`);
  }

  if (actions.includes("missing") && !f.missing && i < 6) {
    flag("warn", i, "missing-early", `missing highlight on “${text.slice(0, 72)}”`);
  }

  const pulses = actions.filter((a) => a.startsWith("pulse-col:"));
  if (pulses.length > 1 && scene.id === "chaos") {
    flag("warn", i, "multi-pulse", `Chaos extra columns pulsing together (${pulses.join(", ")}). Stagger with timeMin.`);
  }

  const callouts = ["callout-pk", "callout-column", "callout-row"].filter((a) => actions.includes(a));
  if (callouts.length === 3 && !/primary key/.test(t)) {
    flag(
      "warn",
      i,
      "legend-all-at-once",
      `All three legend callouts active before PK is spoken (lyric ${i}).`
    );
  }

  if (intent === "questions" && !actions.some((a) => a.startsWith("q:") || a === "show-questions" || a === "enter" || a === "show-title")) {
    if (f.questionRun) {
      flag("warn", i, "q-not-revealed", `Question lyric but no q:N action (${actionStr}).`);
    }
  }

  if (scene.kind === "schema" && f.collectionOfTables) {
    const tablesShown = actions.filter((a) => a.startsWith("show-table:")).length;
    const linksShown = actions.filter((a) => a.startsWith("show-link:")).length;
    if (tablesShown >= 3 || linksShown >= 2) {
      flag(
        "fail",
        i,
        "schema-dump",
        `Definition lyric already showing ${tablesShown} tables / ${linksShown} links. Reveal one table at a time.`
      );
    }
  }
}

const fails = findings.filter((x) => x.level === "fail");
const warns = findings.filter((x) => x.level === "warn");

console.log("Visual ↔ lyric sync (heuristic)\n");
console.log("Lyric → scene");
for (let i = 0; i < lyrics.length; i++) {
  const scene = sceneAtLyric(i);
  const acts = [...activeActions(scene, i, lyrics[i].start + 0.05)].slice(0, 8);
  const snippet = String(lyrics[i].text || "").replace(/\s+/g, " ").slice(0, 70);
  console.log(
    `  ${String(i).padStart(2)}  ${String(scene.id).padEnd(14)}  ${(scene.sceneIntent || scene.kind).padEnd(12)}  ${snippet}`
  );
}

console.log(`\n${fails.length} fail, ${warns.length} warn\n`);
for (const x of [...fails, ...warns]) {
  const mark = x.level === "fail" ? "FAIL" : "WARN";
  console.log(`[${mark}] L${x.lyricIndex} ${x.code}: ${x.detail}`);
}

if (!findings.length) {
  console.log("No high-confidence mismatches.");
}

process.exit(fails.length ? 1 : 0);
