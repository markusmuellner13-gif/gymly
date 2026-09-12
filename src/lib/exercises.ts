/**
 * Shared, client-safe vocabulary for the exercise catalog.
 * The catalog data itself lives in src/data and is loaded on demand.
 */

export type ExerciseGroup =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "upper"
  | "lower"
  | "full"
  | "cardio"
  | "plyo"
  | "stretching"
  | "smr"
  | "mobility";

export type DayKind =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full"
  | "core"
  | "cardio"
  | "mobility"
  | "rest";

export type TrackingMode = "weight" | "time";

/** Compact record shipped to the client for instant search. */
export type ExerciseIndexEntry = {
  i: string;
  n: string;
  e: string;
  l: string | null;
  m: string | null;
  p: string[];
  g: ExerciseGroup[];
  r: string[];
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string;
  category: string;
  primary: string[];
  secondary: string[];
  regions: string[];
  groups: ExerciseGroup[];
  instructions: string[];
  images: string[];
};

export const DAY_KINDS: {
  kind: DayKind;
  label: string;
  blurb: string;
  color: string;
  /** Catalog groups the "+" picker offers by default on this day. */
  groups: ExerciseGroup[];
}[] = [
  { kind: "push", label: "Push", blurb: "Chest · Shoulders · Triceps", color: "#FF5A1F", groups: ["push"] },
  { kind: "pull", label: "Pull", blurb: "Back · Biceps · Forearms", color: "#3B82F6", groups: ["pull"] },
  { kind: "legs", label: "Legs", blurb: "Quads · Hamstrings · Glutes · Calves", color: "#A855F7", groups: ["legs"] },
  { kind: "upper", label: "Upper", blurb: "Everything above the waist", color: "#14B8A6", groups: ["upper"] },
  { kind: "lower", label: "Lower", blurb: "Legs · Glutes · Calves", color: "#F59E0B", groups: ["lower"] },
  { kind: "full", label: "Full body", blurb: "Any strength movement", color: "#EC4899", groups: ["full"] },
  { kind: "core", label: "Core", blurb: "Abs · Obliques · Lower back", color: "#EAB308", groups: ["core"] },
  { kind: "cardio", label: "Cardio", blurb: "Conditioning · Plyometrics", color: "#EF4444", groups: ["cardio", "plyo"] },
  { kind: "mobility", label: "Mobility", blurb: "Stretching · Foam rolling", color: "#22D3EE", groups: ["stretching", "smr"] },
  { kind: "rest", label: "Rest", blurb: "Recovery — light work only", color: "#64748B", groups: ["stretching", "smr"] },
];

const KIND_MAP = new Map(DAY_KINDS.map((d) => [d.kind, d]));

export function dayKindMeta(kind: string) {
  return KIND_MAP.get(kind as DayKind) ?? KIND_MAP.get("full")!;
}

/** Exercises a day of this kind should offer before the user widens the filter. */
export function groupsForKind(kind: string): ExerciseGroup[] {
  return dayKindMeta(kind).groups;
}

/** Cardio and mobility work is tracked by time, not by load. */
export function defaultTrackingMode(groups: ExerciseGroup[]): TrackingMode {
  if (groups.includes("cardio") || groups.includes("stretching") || groups.includes("smr")) {
    return "time";
  }
  return "weight";
}

/** Where the vendored free-exercise-db photography is mirrored. */
const IMAGE_CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

/**
 * Photo URL for a catalog exercise. Every catalog id is URL-safe and its frames
 * live at `<id>/0.jpg` and `<id>/1.jpg`, so the search index can show a
 * thumbnail without shipping 876 image URLs to the client. Three kettlebell
 * movements have no photography and custom exercises never do, so every caller
 * needs a fallback for a frame that fails to load.
 */
export function exerciseImageUrl(exerciseId: string, frame: 0 | 1 = 0) {
  return `${IMAGE_CDN}${exerciseId}/${frame}.jpg`;
}

export const EQUIPMENT_ORDER = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "body only",
  "kettlebells",
  "bands",
  "e-z curl bar",
  "medicine ball",
  "exercise ball",
  "foam roll",
  "other",
];

export const MUSCLE_LABEL: Record<string, string> = {
  abdominals: "Abs",
  abductors: "Abductors",
  adductors: "Adductors",
  biceps: "Biceps",
  calves: "Calves",
  chest: "Chest",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  lats: "Lats",
  "lower back": "Lower back",
  "middle back": "Mid back",
  neck: "Neck",
  quadriceps: "Quads",
  shoulders: "Shoulders",
  traps: "Traps",
  triceps: "Triceps",
};

export const titleCase = (s: string) =>
  s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Volume in kg for one completed exercise entry. Time-tracked work adds none. */
export function entryVolume(
  mode: TrackingMode,
  weightKg: number,
  sets: number,
  reps: number,
) {
  if (mode === "time") return 0;
  return Math.max(0, weightKg) * Math.max(0, sets) * Math.max(0, reps);
}

/** Numbers and dates are formatted in one fixed locale so the server's
 * system locale can never change what a user sees. */
export const LOCALE = "en-GB";

export const KG_PER_LB = 0.45359237;

export function toDisplayWeight(kg: number, units: "kg" | "lb") {
  return units === "lb" ? kg / KG_PER_LB : kg;
}
export function fromDisplayWeight(value: number, units: "kg" | "lb") {
  return units === "lb" ? value * KG_PER_LB : value;
}

export function formatWeight(kg: number, units: "kg" | "lb", digits = 1) {
  const v = toDisplayWeight(kg, units);
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(digits)} ${units}`;
}

/** Big totals read better abbreviated: 12,480 kg -> 12.5t */
export function formatVolume(kg: number, units: "kg" | "lb") {
  const v = toDisplayWeight(kg, units);
  if (v >= 100000) return `${Math.round(v / 1000).toLocaleString()}${units === "kg" ? "t" : "k"}`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}${units === "kg" ? "t" : "k"}`;
  return Math.round(v).toLocaleString(LOCALE);
}

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDurationLong(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
