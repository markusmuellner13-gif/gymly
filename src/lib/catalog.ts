import "server-only";
import raw from "@/data/exercises.json";
import type { Exercise, ExerciseGroup } from "./exercises";

// The catalog is static, public-domain data (free-exercise-db). Keeping it as a
// module instead of database rows means no seeding step and no query per render.
const CATALOG = raw as unknown as Exercise[];
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function allExercises(): Exercise[] {
  return CATALOG;
}

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function exercisesInGroups(groups: ExerciseGroup[]): Exercise[] {
  const wanted = new Set(groups);
  return CATALOG.filter((e) => e.groups.some((g) => wanted.has(g)));
}

/** Name shown when a plan row points at an exercise we no longer recognise. */
export function resolveName(id: string, fallback: string) {
  return BY_ID.get(id)?.name ?? fallback;
}
