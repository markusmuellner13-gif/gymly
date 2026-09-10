"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { planDays, planExercises } from "@/lib/db/schema";
import { newId, requireUser } from "@/lib/auth";
import { DAY_KINDS, type TrackingMode } from "@/lib/exercises";

const VALID_KINDS = new Set(DAY_KINDS.map((k) => k.kind));

/** Throws unless the day exists and belongs to the signed-in user. */
async function ownedDay(dayId: string, userId: string) {
  const [day] = await db()
    .select()
    .from(planDays)
    .where(and(eq(planDays.id, dayId), eq(planDays.userId, userId)))
    .limit(1);
  if (!day) throw new Error("Day not found.");
  return day;
}

async function ownedPlanExercise(planExerciseId: string, userId: string) {
  const [row] = await db()
    .select({ ex: planExercises, dayId: planDays.id })
    .from(planExercises)
    .innerJoin(planDays, eq(planDays.id, planExercises.dayId))
    .where(and(eq(planExercises.id, planExerciseId), eq(planDays.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Exercise not found.");
  return row;
}

/* ---------------------------------- Days ---------------------------------- */

export async function createDayAction(name: string, kind: string) {
  const user = await requireUser();
  const clean = name.trim().slice(0, 40) || "New day";
  const safeKind = VALID_KINDS.has(kind as never) ? kind : "full";

  const [{ value }] = await db()
    .select({ value: max(planDays.position) })
    .from(planDays)
    .where(eq(planDays.userId, user.id));

  const id = newId();
  await db().insert(planDays).values({
    id,
    userId: user.id,
    name: clean,
    kind: safeKind,
    position: (value ?? -1) + 1,
  });
  revalidatePath("/plan");
  return { id };
}

export async function updateDayAction(dayId: string, name: string, kind: string) {
  const user = await requireUser();
  await ownedDay(dayId, user.id);
  await db()
    .update(planDays)
    .set({
      name: name.trim().slice(0, 40) || "Day",
      kind: VALID_KINDS.has(kind as never) ? kind : "full",
    })
    .where(eq(planDays.id, dayId));
  revalidatePath("/plan");
  revalidatePath(`/plan/${dayId}`);
}

export async function deleteDayAction(dayId: string) {
  const user = await requireUser();
  await ownedDay(dayId, user.id);
  await db().delete(planDays).where(eq(planDays.id, dayId));
  revalidatePath("/plan");
}

export async function reorderDaysAction(orderedIds: string[]) {
  const user = await requireUser();
  if (!orderedIds.length) return;
  const owned = await db()
    .select({ id: planDays.id })
    .from(planDays)
    .where(and(eq(planDays.userId, user.id), inArray(planDays.id, orderedIds)));
  const ownedSet = new Set(owned.map((d) => d.id));

  await db().transaction(async (tx) => {
    let position = 0;
    for (const id of orderedIds) {
      if (!ownedSet.has(id)) continue;
      await tx.update(planDays).set({ position: position++ }).where(eq(planDays.id, id));
    }
  });
  revalidatePath("/plan");
}

/* -------------------------------- Exercises -------------------------------- */

export async function addExercisesAction(
  dayId: string,
  picks: { exerciseId: string; name: string; mode: TrackingMode }[],
) {
  const user = await requireUser();
  await ownedDay(dayId, user.id);
  if (!picks.length) return;

  const [{ value }] = await db()
    .select({ value: max(planExercises.position) })
    .from(planExercises)
    .where(eq(planExercises.dayId, dayId));
  let position = (value ?? -1) + 1;

  await db()
    .insert(planExercises)
    .values(
      picks.slice(0, 40).map((p) => ({
        id: newId(),
        dayId,
        exerciseId: p.exerciseId,
        name: p.name.slice(0, 120),
        position: position++,
        trackingMode: p.mode,
        targetSets: p.mode === "time" ? 1 : 3,
        targetReps: p.mode === "time" ? 0 : 10,
        targetSeconds: 600,
        weightKg: p.mode === "time" ? 0 : 20,
      })),
    );
  revalidatePath(`/plan/${dayId}`);
}

export async function removeExerciseAction(planExerciseId: string) {
  const user = await requireUser();
  const { dayId } = await ownedPlanExercise(planExerciseId, user.id);
  await db().delete(planExercises).where(eq(planExercises.id, planExerciseId));
  revalidatePath(`/plan/${dayId}`);
}

export async function updateExerciseTargetsAction(
  planExerciseId: string,
  patch: {
    weightKg?: number;
    targetSets?: number;
    targetReps?: number;
    targetSeconds?: number;
    notes?: string | null;
  },
) {
  const user = await requireUser();
  const { dayId } = await ownedPlanExercise(planExerciseId, user.id);

  const set: Record<string, unknown> = {};
  if (patch.weightKg !== undefined && Number.isFinite(patch.weightKg)) {
    set.weightKg = Math.min(1000, Math.max(0, patch.weightKg));
  }
  if (patch.targetSets !== undefined && Number.isFinite(patch.targetSets)) {
    set.targetSets = Math.min(30, Math.max(1, Math.round(patch.targetSets)));
  }
  if (patch.targetReps !== undefined && Number.isFinite(patch.targetReps)) {
    set.targetReps = Math.min(200, Math.max(0, Math.round(patch.targetReps)));
  }
  if (patch.targetSeconds !== undefined && Number.isFinite(patch.targetSeconds)) {
    set.targetSeconds = Math.min(14400, Math.max(0, Math.round(patch.targetSeconds)));
  }
  if (patch.notes !== undefined) {
    set.notes = patch.notes ? patch.notes.slice(0, 300) : null;
  }
  if (!Object.keys(set).length) return;

  await db().update(planExercises).set(set).where(eq(planExercises.id, planExerciseId));
  revalidatePath(`/plan/${dayId}`);
}

export async function reorderExercisesAction(dayId: string, orderedIds: string[]) {
  const user = await requireUser();
  await ownedDay(dayId, user.id);
  await db().transaction(async (tx) => {
    let position = 0;
    for (const id of orderedIds) {
      await tx
        .update(planExercises)
        .set({ position: position++ })
        .where(and(eq(planExercises.id, id), eq(planExercises.dayId, dayId)));
    }
  });
  revalidatePath(`/plan/${dayId}`);
}

/** Copies every exercise from one day into another (duplicate a session). */
export async function duplicateDayAction(dayId: string) {
  const user = await requireUser();
  const source = await ownedDay(dayId, user.id);

  const [{ value }] = await db()
    .select({ value: max(planDays.position) })
    .from(planDays)
    .where(eq(planDays.userId, user.id));

  const newDayId = newId();
  await db().insert(planDays).values({
    id: newDayId,
    userId: user.id,
    name: `${source.name} copy`.slice(0, 40),
    kind: source.kind,
    position: (value ?? -1) + 1,
  });

  const rows = await db()
    .select()
    .from(planExercises)
    .where(eq(planExercises.dayId, dayId))
    .orderBy(planExercises.position);

  if (rows.length) {
    await db()
      .insert(planExercises)
      .values(
        rows.map((r) => ({
          id: newId(),
          dayId: newDayId,
          exerciseId: r.exerciseId,
          name: r.name,
          position: r.position,
          trackingMode: r.trackingMode,
          targetSets: r.targetSets,
          targetReps: r.targetReps,
          targetSeconds: r.targetSeconds,
          weightKg: r.weightKg,
          notes: r.notes,
        })),
      );
  }
  revalidatePath("/plan");
  return { id: newDayId };
}

/** Used by the picker to warn when a movement is already on the day. */
export async function dayExerciseIdsAction(dayId: string) {
  const user = await requireUser();
  await ownedDay(dayId, user.id);
  const rows = await db()
    .select({ exerciseId: planExercises.exerciseId })
    .from(planExercises)
    .where(eq(planExercises.dayId, dayId));
  return rows.map((r) => r.exerciseId);
}
