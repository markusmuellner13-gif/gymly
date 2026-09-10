// Builds the Gymly exercise catalog from the public-domain free-exercise-db dataset.
// Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain)
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
const raw = JSON.parse(readFileSync(SRC, "utf8"));

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

// Muscle -> coarse body region used across the app.
const REGION = {
  chest: "chest",
  shoulders: "shoulders",
  triceps: "triceps",
  biceps: "biceps",
  forearms: "forearms",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  adductors: "adductors",
  abductors: "abductors",
  abdominals: "core",
  neck: "neck",
};

const PUSH = new Set(["chest", "shoulders", "triceps"]);
const PULL = new Set(["lats", "middle back", "lower back", "traps", "biceps", "forearms"]);
const LEGS = new Set(["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"]);
const CORE = new Set(["abdominals"]);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function groupsFor(x) {
  const g = new Set();
  const primary = x.primaryMuscles || [];
  const cat = x.category;

  if (cat === "cardio") g.add("cardio");
  if (cat === "plyometrics") g.add("plyo");
  if (cat === "stretching") g.add("stretching");
  if (x.equipment === "foam roll") g.add("smr");
  if (g.has("stretching") || g.has("smr")) g.add("mobility");

  // Cardio and mobility work never belongs in a push/pull/legs picker.
  // Plyometrics do (box jumps on leg day), so they are not excluded here.
  const isConditioning = g.has("cardio") || g.has("mobility");

  if (!isConditioning) {
    const hasPush = primary.some((m) => PUSH.has(m));
    const hasPull = primary.some((m) => PULL.has(m));
    const hasLegs = primary.some((m) => LEGS.has(m));
    const hasCore = primary.some((m) => CORE.has(m));

    if (hasPush) g.add("push");
    if (hasPull) g.add("pull");
    if (hasLegs) g.add("legs");
    if (hasCore) g.add("core");
    if (hasPush || hasPull) g.add("upper");
    if (hasLegs) g.add("lower");
    g.add("full");
  }
  return [...g];
}

const catalog = raw.map((x) => {
  const primary = x.primaryMuscles || [];
  const secondary = x.secondaryMuscles || [];
  return {
    id: x.id,
    slug: slug(x.name),
    name: x.name,
    force: x.force || null,
    level: x.level || null,
    mechanic: x.mechanic || null,
    equipment: x.equipment || "other",
    category: x.category,
    primary,
    secondary,
    regions: [...new Set(primary.map((m) => REGION[m]).filter(Boolean))],
    groups: groupsFor(x),
    instructions: x.instructions || [],
    images: (x.images || []).map((p) => CDN + p),
  };
});

// Detect duplicate names so the picker never shows two identical rows.
const seen = new Map();
for (const e of catalog) {
  const k = e.name.toLowerCase();
  seen.set(k, (seen.get(k) || 0) + 1);
}
const dupes = [...seen.entries()].filter(([, n]) => n > 1);

catalog.sort((a, b) => a.name.localeCompare(b.name));

// Full catalog (server-side: includes instructions + images).
writeFileSync("src/data/exercises.json", JSON.stringify(catalog));

// Trimmed index shipped to the client for instant search/filter.
const index = catalog.map((e) => ({
  i: e.id,
  n: e.name,
  e: e.equipment,
  l: e.level,
  m: e.mechanic,
  p: e.primary,
  g: e.groups,
  r: e.regions,
}));
writeFileSync("src/data/exercise-index.json", JSON.stringify(index));

const counts = {};
for (const e of catalog) for (const g of e.groups) counts[g] = (counts[g] || 0) + 1;
console.log("total:", catalog.length);
console.log("group counts:", counts);
console.log("duplicate names:", dupes.length, dupes.slice(0, 5));
const eq = {};
for (const e of catalog) eq[e.equipment] = (eq[e.equipment] || 0) + 1;
console.log("equipment:", eq);
