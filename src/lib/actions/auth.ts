"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { planDays, planExercises, userSettings, users } from "@/lib/db/schema";
import {
  createSession,
  destroySession,
  hashPassword,
  newId,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth";
import { STARTER_PLAN } from "@/lib/starter-plan";

export type AuthState = { error?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

async function seedStarterPlan(userId: string) {
  const dayRows = STARTER_PLAN.map((day, i) => ({
    id: newId(),
    userId,
    name: day.name,
    kind: day.kind,
    position: i,
  }));
  await db().insert(planDays).values(dayRows);

  const exerciseRows = STARTER_PLAN.flatMap((day, i) =>
    day.exercises.map((ex, j) => ({
      id: newId(),
      dayId: dayRows[i].id,
      exerciseId: ex.id,
      name: ex.name,
      position: j,
      targetSets: ex.sets,
      targetReps: ex.reps,
      weightKg: ex.kg,
    })),
  );
  if (exerciseRows.length) await db().insert(planExercises).values(exerciseRows);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  if (formData.get("terms") !== "on") {
    return { error: "Please accept the Terms and Privacy Policy to continue." };
  }

  const email = normalizeEmail(parsed.data.email);
  const [existing] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  const name = (formData.get("name") as string | null)?.trim().slice(0, 60) || null;
  const userId = newId();
  await db().insert(users).values({
    id: userId,
    email,
    name,
    passwordHash: await hashPassword(parsed.data.password),
  });
  await db().insert(userSettings).values({ userId }).onConflictDoNothing();
  await seedStarterPlan(userId);

  const ua = (await headers()).get("user-agent");
  await createSession(userId, ua);
  redirect("/plan");
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  const email = normalizeEmail(parsed.data.email);
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);

  // Always run a hash comparison so a missing account and a wrong password
  // take the same amount of time.
  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, await hashPassword("placeholder"));

  if (!user || !ok) {
    return { error: "Email or password is incorrect." };
  }

  // Signing back in cancels a pending account deletion.
  if (user.deletionRequestedAt) {
    await db()
      .update(users)
      .set({ deletionRequestedAt: null })
      .where(eq(users.id, user.id));
  }

  const ua = (await headers()).get("user-agent");
  await createSession(user.id, ua);
  redirect("/plan");
}

export async function signOutAction() {
  await destroySession();
  redirect("/sign-in");
}
