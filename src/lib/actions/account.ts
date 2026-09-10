"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  planDays,
  planExercises,
  userSettings,
  users,
  workoutEntries,
  workouts,
} from "@/lib/db/schema";
import {
  destroyAllSessions,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/workout";
import { purgeUser } from "@/lib/account-lifecycle";

export async function updateProfileAction(name: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  await db()
    .update(users)
    .set({ name: name.trim().slice(0, 60) || null })
    .where(eq(users.id, user.id));
  revalidatePath("/account");
  return { ok: true, data: null };
}

export async function updateSettingsAction(patch: {
  units?: "kg" | "lb";
  timezone?: string;
  restTimerSec?: number;
  remindersEnabled?: boolean;
  reminderTime?: string;
  reminderDays?: number[];
  streakRemindersEnabled?: boolean;
  analyticsConsent?: boolean;
}): Promise<ActionResult<null>> {
  const user = await requireUser();
  const set: Record<string, unknown> = { updatedAt: Date.now() };

  if (patch.units === "kg" || patch.units === "lb") set.units = patch.units;
  if (typeof patch.timezone === "string" && patch.timezone.length < 64) {
    set.timezone = patch.timezone;
  }
  if (Number.isFinite(patch.restTimerSec)) {
    set.restTimerSec = Math.min(600, Math.max(15, Math.round(patch.restTimerSec!)));
  }
  if (typeof patch.remindersEnabled === "boolean") set.remindersEnabled = patch.remindersEnabled;
  if (typeof patch.streakRemindersEnabled === "boolean") {
    set.streakRemindersEnabled = patch.streakRemindersEnabled;
  }
  if (typeof patch.analyticsConsent === "boolean") set.analyticsConsent = patch.analyticsConsent;
  if (typeof patch.reminderTime === "string" && /^\d{2}:\d{2}$/.test(patch.reminderTime)) {
    set.reminderTime = patch.reminderTime;
  }
  if (Array.isArray(patch.reminderDays)) {
    const days = [...new Set(patch.reminderDays.filter((d) => d >= 0 && d <= 6))].sort();
    set.reminderDays = days;
  }

  await db().update(userSettings).set(set).where(eq(userSettings.userId, user.id));
  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/plan");
  return { ok: true, data: null };
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: "Current password is incorrect." };
  }
  await db()
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id));
  // Every other device has to sign in again with the new password.
  await destroyAllSessions(user.id);
  return { ok: true, data: null };
}

/**
 * Schedules erasure. The account stops working immediately; signing in during
 * the grace window cancels it. A daily job purges anything past the window.
 */
export async function requestDeletionAction(password: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Password is incorrect." };
  }
  await db()
    .update(users)
    .set({ deletionRequestedAt: Date.now() })
    .where(eq(users.id, user.id));
  await destroyAllSessions(user.id);
  await destroySession();
  return { ok: true, data: null };
}

/** Immediate, irreversible erasure of every row belonging to the user. */
export async function deleteAccountNowAction(password: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Password is incorrect." };
  }
  await destroySession();
  // Foreign keys cascade, but libSQL needs them enabled per connection, so the
  // dependent rows are removed explicitly to be certain nothing is orphaned.
  await purgeUser(user.id);
  redirect("/welcome");
}

/** GDPR Article 20: everything we hold about the user, as JSON. */
export async function exportDataAction(): Promise<ActionResult<string>> {
  const user = await requireUser();
  const database = db();

  const [settings] = await database
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));
  const days = await database.select().from(planDays).where(eq(planDays.userId, user.id));
  const allExercises: (typeof planExercises.$inferSelect)[] = [];
  for (const d of days) {
    const rows = await database
      .select()
      .from(planExercises)
      .where(eq(planExercises.dayId, d.id));
    allExercises.push(...rows);
  }
  const sessions = await database.select().from(workouts).where(eq(workouts.userId, user.id));
  const entries: unknown[] = [];
  for (const w of sessions) {
    const rows = await database
      .select()
      .from(workoutEntries)
      .where(eq(workoutEntries.workoutId, w.id));
    entries.push(...rows);
  }

  return {
    ok: true,
    data: JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: new Date(user.createdAt).toISOString(),
        },
        settings,
        planDays: days,
        planExercises: allExercises,
        workouts: sessions,
        workoutEntries: entries,
      },
      null,
      2,
    ),
  };
}
