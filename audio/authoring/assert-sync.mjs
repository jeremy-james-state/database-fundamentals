#!/usr/bin/env node
/**
 * Check runtime scenes still match authoring milestones.
 *   node audio/authoring/assert-sync.mjs
 */
import { SCENES } from "../player/visual-stage.js";
import { milestoneIds, visualPlan } from "./lesson-flow.js";

const ids = milestoneIds();
const sceneIds = SCENES.map((s) => s.id);
const missingInScenes = ids.filter((id) => !sceneIds.includes(id));
const extraScenes = sceneIds.filter((id) => !ids.includes(id));
const plan = visualPlan();

const mismatches = [];
for (const scene of SCENES) {
  const v = plan[scene.id];
  if (!v) continue;
  if (scene.kind && v.kind && scene.kind !== v.kind) {
    mismatches.push(`${scene.id} kind player=${scene.kind} plan=${v.kind}`);
  }
  if (scene.sceneIntent && v.sceneIntent && scene.sceneIntent !== v.sceneIntent) {
    mismatches.push(
      `${scene.id} sceneIntent player=${scene.sceneIntent} plan=${v.sceneIntent}`
    );
  }
}

console.log("Authoring ↔ visual-stage\n");
console.log(`milestones: ${ids.join(", ")}`);
console.log(`scenes:     ${sceneIds.join(", ")}`);

let fails = 0;
if (missingInScenes.length) {
  fails += 1;
  console.log(`FAIL missing scenes for milestones: ${missingInScenes.join(", ")}`);
}
if (extraScenes.length) {
  console.log(`WARN scenes not in lesson-flow: ${extraScenes.join(", ")}`);
}
for (const m of mismatches) {
  fails += 1;
  console.log(`FAIL ${m}`);
}
if (!fails) console.log("\nOK — every milestone has a scene; kinds/intents match.");
process.exit(fails ? 1 : 0);
