import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  planDays,
  planExercises,
  pushSubscriptions,
  userSettings,
  users,
  workoutEntries,
  workouts,
} from "./db/schema";

/** How long a deleted account can still be recovered by signing back in. */
export const DELETION_GRACE_DAYS = 14;

/**
 * Irreversibly removes every row belonging to a user.
 * Deliberately NOT a server action: it must only ever be reachable from
 * server code that has already authenticated the caller.
 */
export async function purgeUser(userId: string) {
  const database = db();

  const userWorkouts = await database
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.userId, userId));
  for (const w of userWorkouts) {
    await database.delete(workoutEntries).where(eq(workoutEntries.workoutId, w.id));
  }
  await database.delete(workouts).where(eq(workouts.userId, userId));

  const days = await database
    .select({ id: planDays.id })
    .from(planDays)
    .where(eq(planDays.userId, userId));
  for (const d of days) {
    await database.delete(planExercises).where(eq(planExercises.dayId, d.id));
  }
  await database.delete(planDays).where(eq(planDays.userId, userId));

  await database.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  await database.delete(userSettings).where(eq(userSettings.userId, userId));
  await database.delete(users).where(eq(users.id, userId));
}
