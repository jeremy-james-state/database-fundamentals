#!/usr/bin/env node
/** Write full script + per-milestone clips for fast TTS. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileLesson, spokenScript } from "./lesson-flow.js";

const dir = dirname(fileURLToPath(import.meta.url));
const spokenDir = join(dir, "spoken");
mkdirSync(spokenDir, { recursive: true });

const compiled = compileLesson();
writeFileSync(join(dir, "spoken.txt"), spokenScript(compiled));
for (const m of compiled.milestones) {
  writeFileSync(join(spokenDir, `${m.id}.txt`), `${m.narration.trim()}\n`);
}
console.log(`Wrote ${join(dir, "spoken.txt")} and ${compiled.milestones.length} files in spoken/`);
