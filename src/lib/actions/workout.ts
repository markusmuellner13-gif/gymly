"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { planDays, planExercises, workoutEntries, workouts } from "@/lib/db/schema";
import { newId, requireUser } from "@/lib/auth";
import { entryVolume } from "@/lib/exercises";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** The workout the user currently has running, if any. */
async function activeWorkout(userId: string) {
  const [row] = await db()
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNull(workouts.endedAt)))
    .limit(1);
  return row ?? null;
}

async function ownedDay(dayId: string, userId: string) {
  const [day] = await db()
    .select()
    .from(planDays)
    .where(and(eq(planDays.id, dayId), eq(planDays.userId, userId)))
    .limit(1);
  return day ?? null;
}

/* --------------------------- Session lifecycle ----------------------------- */

export async function startWorkoutAction(dayId: string): Promise<ActionResult<{ startedAt: number; workoutId: string }>> {
  const user = await requireUser();
  const day = await ownedDay(dayId, user.id);
  if (!day) return { ok: false, error: "That day no longer exists." };

  const running = await activeWorkout(user.id);
  if (running) {
    if (running.dayId === dayId) {
      return { ok: true, data: { startedAt: running.startedAt, workoutId: running.id } };
    }
    return {
      ok: false,
      error: `A ${running.dayName} session is already running. Finish it first.`,
    };
  }

  const id = newId();
  const startedAt = Date.now();
  await db().insert(workouts).values({
    id,
    userId: user.id,
    dayId,
    dayName: day.name,
    dayKind: day.kind,
    startedAt,
  });
  revalidatePath(`/plan/${dayId}`);
  revalidatePath("/plan");
  return { ok: true, data: { startedAt, workoutId: id } };
}

export async function finishWorkoutAction(): Promise<
  ActionResult<{ durationSec: number; volumeKg: number; completed: number }>
> {
  const user = await requireUser();
  const running = await activeWorkout(user.id);
  if (!running) return { ok: false, error: "No session is running." };

  const [totals] = await db()
    .select({
      volume: sql<number>`coalesce(sum(${workoutEntries.volumeKg}), 0)`,
      sets: sql<number>`coalesce(sum(${workoutEntries.sets}), 0)`,
      reps: sql<number>`coalesce(sum(${workoutEntries.sets} * ${workoutEntries.reps}), 0)`,
      done: sql<number>`count(*)`,
    })
    .from(workoutEntries)
    .where(and(eq(workoutEntries.workoutId, running.id), eq(workoutEntries.completed, true)));

  const endedAt = Date.now();
  const durationSec = Math.max(0, Math.round((endedAt - running.startedAt) / 1000));

  await db()
    .update(workouts)
    .set({
      endedAt,
      durationSec,
      volumeKg: totals?.volume ?? 0,
      completedCount: totals?.done ?? 0,
      totalSets: totals?.sets ?? 0,
      totalReps: totals?.reps ?? 0,
    })
    .where(eq(workouts.id, running.id));

  // A sub-minute session with nothing ticked off was a mis-tap, not training.
  // Anything longer is kept even if the user forgot to tick the boxes.
  if ((totals?.done ?? 0) === 0 && durationSec < 60) {
    await db().delete(workouts).where(eq(workouts.id, running.id));
  }

  if (running.dayId) revalidatePath(`/plan/${running.dayId}`);
  revalidatePath("/plan");
  revalidatePath("/account");
  return {
    ok: true,
    data: { durationSec, volumeKg: totals?.volume ?? 0, completed: totals?.done ?? 0 },
  };
}

export async function discardWorkoutAction(): Promise<ActionResult<null>> {
  const user = await requireUser();
  const running = await activeWorkout(user.id);
  if (!running) return { ok: false, error: "No session is running." };
  await db().delete(workouts).where(eq(workouts.id, running.id));
  if (running.dayId) revalidatePath(`/plan/${running.dayId}`);
  revalidatePath("/plan");
  return { ok: true, data: null };
}

/* ------------------------------- Set logging -------------------------------- */

/**
 * Ticks an exercise off (or un-ticks it). Starting the timer first is optional:
 * the first tick opens a session automatically so no work is ever lost.
 */
export async function toggleExerciseAction(
  planExerciseId: string,
  completed: boolean,
): Promise<ActionResult<{ volumeKg: number; startedAt: number; autoStarted: boolean }>> {
  const user = await requireUser();

  const [row] = await db()
    .select({ ex: planExercises, day: planDays })
    .from(planExercises)
    .innerJoin(planDays, eq(planDays.id, planExercises.dayId))
    .where(and(eq(planExercises.id, planExerciseId), eq(planDays.userId, user.id)))
    .limit(1);
  if (!row) return { ok: false, error: "That exercise is no longer on your plan." };

  let running = await activeWorkout(user.id);
  let autoStarted = false;

  if (running && running.dayId !== row.day.id) {
    return {
      ok: false,
      error: `A ${running.dayName} session is already running. Finish it first.`,
    };
  }

  if (!running) {
    if (!completed) return { ok: false, error: "No session is running." };
    const started = await startWorkoutAction(row.day.id);
    if (!started.ok) return started;
    running = await activeWorkout(user.id);
    autoStarted = true;
    if (!running) return { ok: false, error: "Could not start the session." };
  }

  const { ex } = row;
  const volume = completed
    ? entryVolume(ex.trackingMode, ex.weightKg, ex.targetSets, ex.targetReps)
    : 0;

  await db()
    .insert(workoutEntries)
    .values({
      id: newId(),
      workoutId: running.id,
      planExerciseId,
      exerciseId: ex.exerciseId,
      name: ex.name,
      trackingMode: ex.trackingMode,
      sets: ex.targetSets,
      reps: ex.targetReps,
      seconds: ex.targetSeconds,
      weightKg: ex.weightKg,
      volumeKg: volume,
      completed,
      position: ex.position,
    })
    .onConflictDoUpdate({
      target: [workoutEntries.workoutId, workoutEntries.planExerciseId],
      set: {
        completed,
        volumeKg: volume,
        weightKg: ex.weightKg,
        sets: ex.targetSets,
        reps: ex.targetReps,
        seconds: ex.targetSeconds,
        name: ex.name,
      },
    });

  const total = await sessionVolume(running.id);
  revalidatePath(`/plan/${row.day.id}`);
  return { ok: true, data: { volumeKg: total, startedAt: running.startedAt, autoStarted } };
}

/**
 * Saves the working weight for an exercise. The value sticks on the plan so the
 * next session starts where this one finished, and any already-ticked entry in
 * the running session is recalculated.
 */
export async function setWorkingWeightAction(
  planExerciseId: string,
  weightKg: number,
  targets?: { sets?: number; reps?: number; seconds?: number },
): Promise<ActionResult<{ volumeKg: number }>> {
  const user = await requireUser();

  const [row] = await db()
    .select({ ex: planExercises, day: planDays })
    .from(planExercises)
    .innerJoin(planDays, eq(planDays.id, planExercises.dayId))
    .where(and(eq(planExercises.id, planExerciseId), eq(planDays.userId, user.id)))
    .limit(1);
  if (!row) return { ok: false, error: "That exercise is no longer on your plan." };

  const kg = Math.min(1000, Math.max(0, Number.isFinite(weightKg) ? weightKg : 0));
  const sets = clampInt(targets?.sets ?? row.ex.targetSets, 1, 30);
  const reps = clampInt(targets?.reps ?? row.ex.targetReps, 0, 200);
  const seconds = clampInt(targets?.seconds ?? row.ex.targetSeconds, 0, 14400);

  await db()
    .update(planExercises)
    .set({ weightKg: kg, targetSets: sets, targetReps: reps, targetSeconds: seconds })
    .where(eq(planExercises.id, planExerciseId));

  const running = await activeWorkout(user.id);
  let total = 0;
  if (running && running.dayId === row.day.id) {
    const volume = entryVolume(row.ex.trackingMode, kg, sets, reps);
    await db()
      .update(workoutEntries)
      .set({
        weightKg: kg,
        sets,
        reps,
        seconds,
        volumeKg: sql`case when ${workoutEntries.completed} then ${volume} else 0 end`,
      })
      .where(
        and(
          eq(workoutEntries.workoutId, running.id),
          eq(workoutEntries.planExerciseId, planExerciseId),
        ),
      );
    total = await sessionVolume(running.id);
  }

  revalidatePath(`/plan/${row.day.id}`);
  return { ok: true, data: { volumeKg: total } };
}

async function sessionVolume(workoutId: string) {
  const [t] = await db()
    .select({ volume: sql<number>`coalesce(sum(${workoutEntries.volumeKg}), 0)` })
    .from(workoutEntries)
    .where(and(eq(workoutEntries.workoutId, workoutId), eq(workoutEntries.completed, true)));
  return t?.volume ?? 0;
}

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.round(v)));
}
