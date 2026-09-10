"use server";

import { getExercise } from "@/lib/catalog";
import type { Exercise } from "@/lib/exercises";

/**
 * Full record for one exercise, fetched on demand so the instructions and
 * image URLs for 876 movements never ship to the client up front.
 */
export async function getExerciseDetailAction(id: string): Promise<Exercise | null> {
  return getExercise(id) ?? null;
}
