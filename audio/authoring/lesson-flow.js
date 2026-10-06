/**
 * Lesson authoring order (do not reverse):
 *   1. learningGoals / extractOutcomes
 *   2. milestones
 *   3. visualPlan
 *   4. narrationForMilestone  ← spoken text last
 *
 * Runtime player still reads `audio/player/visual-stage.js` + `media/cues.json`.
 * Stamp scenes with `stampAuthoring(SCENES)` so each scene carries its goal + one idea.
 * After TTS: `python3 audio/player/build-cues.py`
 */

/** @typedef {{ id: string, outcome: string }} Goal */
/** @typedef {{ id: string, goalIds: string[], oneIdea: string, hold: string }} Milestone */
/** @typedef {{ kind: string, sceneIntent: string, reveal: string[] }} VisualBeat */

export function learningGoals() {
  return [
    {
      id: "need-structure",
      outcome: "You can say why a spreadsheet roster falls apart once jobs and duplicates pile up.",
    },
    {
      id: "what-rdb",
      outcome: "You can define a relational database as a collection of related tables.",
    },
    {
      id: "made-of",
      outcome: "You can name what it is made of: tables, rows, columns, keys, and relationships.",
    },
    {
      id: "one-entity",
      outcome: "You can keep one entity per table, and spot redundancy / delete / insert anomalies.",
    },
    {
      id: "rdbms-sql",
      outcome: "You can tell an RDBMS from SQL, and run a one-column SELECT with a WHERE filter.",
    },
  ];
}

/**
 * Refine canonical goals with definition-like lines from a script (does not invent new goals).
 * @param {string} scriptText
 * @param {Goal[]} [base]
 */
export function extractOutcomes(scriptText, base = learningGoals()) {
  const text = String(scriptText || "");
  return base.map((g) => {
    if (g.id === "what-rdb" && /collection of related tables/i.test(text)) {
      return { ...g, evidence: "script states: a relational database is a collection of related tables" };
    }
    if (g.id === "made-of" && /rows, columns, and keys/i.test(text)) {
      return { ...g, evidence: "script states: rows, columns, keys; relationships between tables" };
    }
    return g;
  });
}

/**
 * Timed beats: one idea each. Hold = what must stay on screen until the idea is spoken.
 * @param {Goal[]} [_goals]
 * @returns {Milestone[]}
 */
export function milestones(_goals = learningGoals()) {
  return [
    { id: "members", goalIds: ["need-structure"], oneIdea: "A club roster lives in one sheet", hold: "roster table" },
    { id: "messy", goalIds: ["need-structure"], oneIdea: "Duplicates and missing cells appear", hold: "dup + missing cells" },
    { id: "chaos", goalIds: ["need-structure"], oneIdea: "Extra jobs stuffed into the sheet", hold: "extra columns, then structure punchline" },
    { id: "topics", goalIds: ["what-rdb", "made-of", "rdbms-sql"], oneIdea: "Four questions, then short answers", hold: "one question at a time; answers after the ask" },
    { id: "enter-db", goalIds: ["what-rdb", "made-of"], oneIdea: "Related tables appear one at a time, then matching keys", hold: "users → products → reviews → email link → product_id link → states → addresses" },
    { id: "what-is", goalIds: ["made-of", "one-entity"], oneIdea: "A table is rows and columns with one job", hold: "one mini table" },
    { id: "entity-intro", goalIds: ["one-entity"], oneIdea: "An entity is a thing you can describe", hold: "question, then chips" },
    { id: "product-teach", goalIds: ["made-of", "one-entity"], oneIdea: "Attributes become columns; a unique id is the primary key", hold: "column, then row, then PK — not all three at once" },
    { id: "bad-table", goalIds: ["one-entity"], oneIdea: "Two entities in one table cause anomalies", hold: "redundancy, then Dave delete, then insert ghost" },
    { id: "rdbms", goalIds: ["rdbms-sql"], oneIdea: "RDBMS is the software; SQL is how you talk to it", hold: "vendors, then SQL layer" },
    { id: "sql-taste", goalIds: ["rdbms-sql"], oneIdea: "SELECT name … WHERE price > 20 returns three names", hold: "query, then three result rows" },
    { id: "sql-english", goalIds: ["rdbms-sql"], oneIdea: "SELECT / FROM / WHERE map to columns, table, rows", hold: "one clause at a time" },
    { id: "recap", goalIds: ["what-rdb", "rdbms-sql"], oneIdea: "Tables, RDBMS, SQL as one chain", hold: "flow nodes" },
  ];
}

/**
 * Visuals bound to milestones. No spoken sentences here.
 * @param {Milestone[]} beats
 * @returns {Record<string, VisualBeat>}
 */
export function visualPlan(beats = milestones()) {
  const plan = {
    members: { kind: "table", sceneIntent: "club-table", reveal: ["enter", "show-header", "reveal-rows"] },
    messy: { kind: "table", sceneIntent: "duplicates", reveal: ["highlight-dups", "missing"] },
    chaos: { kind: "chaos", sceneIntent: "chaos", reveal: ["chaos", "missing", "structure-hint"] },
    topics: { kind: "roadmap", sceneIntent: "questions", reveal: ["q:0", "q:1", "q:2", "q:3", "a:0", "a:1", "a:2", "a:3"] },
    "enter-db": {
      kind: "schema",
      sceneIntent: "schema",
      reveal: [
        "show-title",
        "show-table:users",
        "show-table:products",
        "show-table:reviews",
        "show-link:0",
        "show-link:1",
        "show-table:states",
        "show-table:addresses",
        "show-link:2",
        "focus-products",
      ],
    },
    "what-is": { kind: "one-table", sceneIntent: "table", reveal: ["show-grid"] },
    "entity-intro": { kind: "entity-chips", sceneIntent: "entity", reveal: ["show-question", "chip:product"] },
    "product-teach": { kind: "product-teach", sceneIntent: "teach", reveal: ["callout-column", "callout-row", "callout-pk"] },
    "bad-table": { kind: "bad-grid", sceneIntent: "anomalies", reveal: ["redundancy", "anomaly", "insertion", "punchline"] },
    rdbms: { kind: "rdbms", sceneIntent: "rdbms", reveal: ["show-cylinder", "vendor:0", "show-sql-layer"] },
    "sql-taste": { kind: "sql", sceneIntent: "sql", reveal: ["show-prompt", "sql-line:0", "results"] },
    "sql-english": { kind: "sql", sceneIntent: "sql", reveal: ["clause:0", "clause:1", "clause:2"] },
    recap: { kind: "map", sceneIntent: "map", reveal: ["node:rdb", "node:rdbms", "node:sql"] },
  };
  for (const m of beats) {
    if (!plan[m.id]) throw new Error(`visualPlan missing milestone ${m.id}`);
  }
  return plan;
}

const SPOKEN = {
  members:
    "Picture a club with fifty members, and one spreadsheet holding the whole story: names, emails, and phone numbers.",
  messy: "Then the cracks show. Someone gets added twice. Someone else’s email gets overwritten.",
  chaos:
    "Suddenly you’re tracking payments, committees, and event RSVPs. You don’t need a bigger spreadsheet. You need structure.",
  topics:
    "So what is a database, really? Why tables? What’s a primary key? Why an RDBMS? Here’s the short version — then you’ll write a line of SQL.",
  "enter-db":
    "A relational database is a collection of related tables. Add users, then products, then reviews. Matching keys are the relationships. Inside each table: rows, columns, and keys. That’s what it is made of.",
  "what-is":
    "A table looks like a spreadsheet, with rows and columns, but it isn’t a junk drawer. One table has one job.",
  "entity-intro": "So what’s an entity? A thing you can describe — a product, a customer, an order.",
  "product-teach":
    "Each product is an entity. Name, description, price, manufacturer become columns; each product is a row. The unique product ID is the primary key.",
  "bad-table":
    "Cram customers and products together and you get redundancy, a delete anomaly, and an insertion anomaly. One table, one entity.",
  rdbms:
    "The RDBMS is the software that stores this world. SQL is how you talk to it.",
  "sql-taste":
    "SELECT name FROM product WHERE price > 20. You should get one column with three product names.",
  "sql-english": "SELECT picks columns. FROM picks the table. WHERE filters rows.",
  recap: "Spreadsheets break. Relational databases organize tables around entities, with keys. An RDBMS manages that world, and SQL is how you talk to it.",
};

/**
 * Spoken copy last: serves the visual + goal, not the reverse.
 * @param {Milestone} milestone
 * @param {VisualBeat} [_visual]
 * @param {Goal[]} [_goals]
 */
export function narrationForMilestone(milestone, _visual, _goals) {
  const text = SPOKEN[milestone.id];
  if (!text) throw new Error(`narrationForMilestone missing copy for ${milestone.id}`);
  return text;
}

export function compileLesson(scriptText = "") {
  const goals = extractOutcomes(scriptText, learningGoals());
  const beats = milestones(goals);
  const visuals = visualPlan(beats);
  return {
    goals,
    milestones: beats.map((m) => ({
      ...m,
      visual: visuals[m.id],
      narration: narrationForMilestone(m, visuals[m.id], goals),
    })),
  };
}

export function spokenScript(compiled = compileLesson()) {
  return compiled.milestones.map((m) => m.narration).join("\n\n") + "\n";
}

export function milestoneIds() {
  return milestones().map((m) => m.id);
}

/** Stamp runtime SCENES with authoring metadata (does not change playback actions). */
export function stampAuthoring(scenes) {
  const beats = Object.fromEntries(milestones().map((m) => [m.id, m]));
  const visuals = visualPlan();
  return scenes.map((scene) => {
    const m = beats[scene.id];
    if (!m) return scene;
    return {
      ...scene,
      oneIdea: m.oneIdea,
      goalIds: m.goalIds,
      authoringKind: visuals[scene.id]?.kind,
    };
  });
}
