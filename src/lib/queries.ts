import "server-only";
import { and, count, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { planDays, planExercises, workoutEntries, workouts } from "./db/schema";
import { entryVolume } from "./exercises";

/* ------------------------------ Plan overview ------------------------------ */

export type PlanDaySummary = {
  id: string;
  name: string;
  kind: string;
  position: number;
  exerciseCount: number;
  plannedVolumeKg: number;
  lastTrainedAt: number | null;
};

export async function getPlanOverview(userId: string): Promise<PlanDaySummary[]> {
  const days = await db()
    .select()
    .from(planDays)
    .where(eq(planDays.userId, userId))
    .orderBy(planDays.position, planDays.createdAt);
  if (!days.length) return [];

  const exercises = await db()
    .select({
      dayId: planExercises.dayId,
      trackingMode: planExercises.trackingMode,
      weightKg: planExercises.weightKg,
      targetSets: planExercises.targetSets,
      targetReps: planExercises.targetReps,
    })
    .from(planExercises)
    .innerJoin(planDays, eq(planDays.id, planExercises.dayId))
    .where(eq(planDays.userId, userId));

  const lastTrained = await db()
    .select({ dayId: workouts.dayId, last: sql<number>`max(${workouts.startedAt})` })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNotNull(workouts.endedAt)))
    .groupBy(workouts.dayId);

  const lastMap = new Map(lastTrained.map((r) => [r.dayId, r.last]));
  const agg = new Map<string, { n: number; volume: number }>();
  for (const e of exercises) {
    const cur = agg.get(e.dayId) ?? { n: 0, volume: 0 };
    cur.n += 1;
    cur.volume += entryVolume(e.trackingMode, e.weightKg, e.targetSets, e.targetReps);
    agg.set(e.dayId, cur);
  }

  return days.map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    position: d.position,
    exerciseCount: agg.get(d.id)?.n ?? 0,
    plannedVolumeKg: agg.get(d.id)?.volume ?? 0,
    lastTrainedAt: lastMap.get(d.id) ?? null,
  }));
}

/* -------------------------------- Day detail -------------------------------- */

export type DayExerciseRow = {
  id: string;
  exerciseId: string;
  name: string;
  position: number;
  trackingMode: "weight" | "time";
  targetSets: number;
  targetReps: number;
  targetSeconds: number;
  weightKg: number;
  notes: string | null;
  completed: boolean;
  lastWeightKg: number | null;
  bestWeightKg: number | null;
};

export async function getDayDetail(userId: string, dayId: string) {
  const [day] = await db()
    .select()
    .from(planDays)
    .where(and(eq(planDays.id, dayId), eq(planDays.userId, userId)))
    .limit(1);
  if (!day) return null;

  const rows = await db()
    .select()
    .from(planExercises)
    .where(eq(planExercises.dayId, dayId))
    .orderBy(planExercises.position, planExercises.createdAt);

  const [running] = await db()
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNull(workouts.endedAt)))
    .limit(1);

  const isThisDay = running?.dayId === dayId;
  const entries = isThisDay
    ? await db()
        .select()
        .from(workoutEntries)
        .where(eq(workoutEntries.workoutId, running.id))
    : [];
  const entryMap = new Map(entries.map((e) => [e.planExerciseId ?? "", e]));

  // Personal bests across completed history, used for the "best" hint per row.
  const bests = rows.length
    ? await db()
        .select({
          exerciseId: workoutEntries.exerciseId,
          best: sql<number>`max(${workoutEntries.weightKg})`,
        })
        .from(workoutEntries)
        .innerJoin(workouts, eq(workouts.id, workoutEntries.workoutId))
        .where(
          and(
            eq(workouts.userId, userId),
            isNotNull(workouts.endedAt),
            eq(workoutEntries.completed, true),
          ),
        )
        .groupBy(workoutEntries.exerciseId)
    : [];
  const bestMap = new Map(bests.map((b) => [b.exerciseId, b.best]));

  const exercises: DayExerciseRow[] = rows.map((r) => ({
    id: r.id,
    exerciseId: r.exerciseId,
    name: r.name,
    position: r.position,
    trackingMode: r.trackingMode,
    targetSets: r.targetSets,
    targetReps: r.targetReps,
    targetSeconds: r.targetSeconds,
    weightKg: r.weightKg,
    notes: r.notes,
    completed: entryMap.get(r.id)?.completed ?? false,
    lastWeightKg: null,
    bestWeightKg: bestMap.get(r.exerciseId) ?? null,
  }));

  const liveVolume = entries
    .filter((e) => e.completed)
    .reduce((sum, e) => sum + e.volumeKg, 0);

  return {
    day,
    exercises,
    active: running
      ? {
          id: running.id,
          dayId: running.dayId,
          dayName: running.dayName,
          startedAt: running.startedAt,
          isThisDay,
        }
      : null,
    liveVolumeKg: liveVolume,
  };
}

/* ---------------------------------- Stats ----------------------------------- */

export type AllTimeStats = Awaited<ReturnType<typeof getAllTimeStats>>;

export async function getAllTimeStats(userId: string, timezone: string) {
  const finished = and(eq(workouts.userId, userId), isNotNull(workouts.endedAt));

  const [totals] = await db()
    .select({
      sessions: count(),
      volume: sql<number>`coalesce(sum(${workouts.volumeKg}), 0)`,
      seconds: sql<number>`coalesce(sum(${workouts.durationSec}), 0)`,
      sets: sql<number>`coalesce(sum(${workouts.totalSets}), 0)`,
      reps: sql<number>`coalesce(sum(${workouts.totalReps}), 0)`,
      exercises: sql<number>`coalesce(sum(${workouts.completedCount}), 0)`,
      first: sql<number | null>`min(${workouts.startedAt})`,
    })
    .from(workouts)
    .where(finished);

  const history = await db()
    .select({ startedAt: workouts.startedAt, volumeKg: workouts.volumeKg, durationSec: workouts.durationSec })
    .from(workouts)
    .where(finished)
    .orderBy(desc(workouts.startedAt));

  const byKind = await db()
    .select({
      kind: workouts.dayKind,
      n: count(),
      volume: sql<number>`coalesce(sum(${workouts.volumeKg}), 0)`,
    })
    .from(workouts)
    .where(finished)
    .groupBy(workouts.dayKind)
    .orderBy(desc(count()));

  const topExercises = await db()
    .select({
      exerciseId: workoutEntries.exerciseId,
      name: sql<string>`max(${workoutEntries.name})`,
      times: count(),
      volume: sql<number>`coalesce(sum(${workoutEntries.volumeKg}), 0)`,
      best: sql<number>`max(${workoutEntries.weightKg})`,
    })
    .from(workoutEntries)
    .innerJoin(workouts, eq(workouts.id, workoutEntries.workoutId))
    .where(and(finished, eq(workoutEntries.completed, true)))
    .groupBy(workoutEntries.exerciseId)
    .orderBy(desc(sql`sum(${workoutEntries.volumeKg})`))
    .limit(8);

  const personalRecords = await db()
    .select({
      exerciseId: workoutEntries.exerciseId,
      name: sql<string>`max(${workoutEntries.name})`,
      best: sql<number>`max(${workoutEntries.weightKg})`,
    })
    .from(workoutEntries)
    .innerJoin(workouts, eq(workouts.id, workoutEntries.workoutId))
    .where(
      and(finished, eq(workoutEntries.completed, true), eq(workoutEntries.trackingMode, "weight")),
    )
    .groupBy(workoutEntries.exerciseId)
    .orderBy(desc(sql`max(${workoutEntries.weightKg})`))
    .limit(8);

  const dayKeys = history.map((h) => localDayKey(h.startedAt, timezone));
  const { current, longest } = streaks(dayKeys, timezone);

  const weekAgo = Date.now() - 7 * 864e5;
  const monthAgo = Date.now() - 30 * 864e5;

  return {
    sessions: totals?.sessions ?? 0,
    volumeKg: totals?.volume ?? 0,
    seconds: totals?.seconds ?? 0,
    sets: totals?.sets ?? 0,
    reps: totals?.reps ?? 0,
    exercisesCompleted: totals?.exercises ?? 0,
    firstWorkoutAt: totals?.first ?? null,
    avgSeconds: totals?.sessions ? Math.round((totals.seconds ?? 0) / totals.sessions) : 0,
    avgVolumeKg: totals?.sessions ? (totals.volume ?? 0) / totals.sessions : 0,
    sessionsThisWeek: history.filter((h) => h.startedAt >= weekAgo).length,
    sessionsThisMonth: history.filter((h) => h.startedAt >= monthAgo).length,
    volumeThisWeek: history
      .filter((h) => h.startedAt >= weekAgo)
      .reduce((s, h) => s + h.volumeKg, 0),
    currentStreak: current,
    longestStreak: longest,
    activeDays: new Set(dayKeys).size,
    byKind,
    topExercises,
    personalRecords,
    weekly: weeklyBuckets(history, timezone),
  };
}

export async function getRecentWorkouts(userId: string, limit = 12) {
  return db()
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNotNull(workouts.endedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);
}

export async function getActiveWorkout(userId: string) {
  const [row] = await db()
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNull(workouts.endedAt)))
    .limit(1);
  return row ?? null;
}

export async function getWeekVolume(userId: string) {
  const since = Date.now() - 7 * 864e5;
  const [row] = await db()
    .select({
      volume: sql<number>`coalesce(sum(${workouts.volumeKg}), 0)`,
      sessions: count(),
    })
    .from(workouts)
    .where(
      and(eq(workouts.userId, userId), isNotNull(workouts.endedAt), gte(workouts.startedAt, since)),
    );
  return { volumeKg: row?.volume ?? 0, sessions: row?.sessions ?? 0 };
}

/* --------------------------------- Helpers ---------------------------------- */

/** YYYY-MM-DD in the user's own timezone, so streaks match their calendar. */
function localDayKey(ts: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function streaks(dayKeysDesc: string[], timezone: string) {
  const unique = [...new Set(dayKeysDesc)].sort().reverse();
  if (!unique.length) return { current: 0, longest: 0 };

  const today = localDayKey(Date.now(), timezone);
  const yesterday = localDayKey(Date.now() - 864e5, timezone);

  let current = 0;
  // A streak stays alive until the end of the following day.
  if (unique[0] === today || unique[0] === yesterday) {
    current = 1;
    for (let i = 1; i < unique.length; i++) {
      if (dayBefore(unique[i - 1]) === unique[i]) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (dayBefore(unique[i - 1]) === unique[i]) run++;
    else run = 1;
    if (run > longest) longest = run;
  }

  return { current, longest };
}

function dayBefore(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/** Last 12 weeks of volume, oldest first, for the sparkline on the stats page. */
function weeklyBuckets(
  history: { startedAt: number; volumeKg: number }[],
  timezone: string,
) {
  const weeks: { label: string; volumeKg: number; sessions: number }[] = [];
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const end = now - i * 7 * 864e5;
    const start = end - 7 * 864e5;
    const inRange = history.filter((h) => h.startedAt > start && h.startedAt <= end);
    weeks.push({
      label: localDayKey(end, timezone).slice(5),
      volumeKg: inRange.reduce((s, h) => s + h.volumeKg, 0),
      sessions: inRange.length,
    });
  }
  return weeks;
}
