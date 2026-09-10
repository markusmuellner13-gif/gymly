import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    createdAt: integer("created_at").notNull().default(now),
    // Set when the user requests deletion; a cron purges the row after the
    // grace period so an accidental deletion can still be undone.
    deletionRequestedAt: integer("deletion_requested_at"),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  units: text("units", { enum: ["kg", "lb"] }).notNull().default("kg"),
  timezone: text("timezone").notNull().default("Europe/Rome"),
  restTimerSec: integer("rest_timer_sec").notNull().default(90),
  remindersEnabled: integer("reminders_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  reminderTime: text("reminder_time").notNull().default("18:00"),
  // JSON array of weekday numbers, 0 = Sunday.
  reminderDays: text("reminder_days", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default([1, 2, 3, 4, 5]),
  streakRemindersEnabled: integer("streak_reminders_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  analyticsConsent: integer("analytics_consent", { mode: "boolean" })
    .notNull()
    .default(false),
  // Guards against a re-run of the reminder job double-notifying someone.
  lastRemindedAt: integer("last_reminded_at"),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 of the opaque cookie token; the raw token is never stored.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now),
    expiresAt: integer("expires_at").notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const planDays = sqliteTable(
  "plan_days",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Drives which exercises the "+" picker offers by default.
    kind: text("kind").notNull().default("full"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("plan_days_user_idx").on(t.userId, t.position)],
);

export const planExercises = sqliteTable(
  "plan_exercises",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => planDays.id, { onDelete: "cascade" }),
    // Catalog id, or a custom_exercises id.
    exerciseId: text("exercise_id").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    trackingMode: text("tracking_mode", { enum: ["weight", "time"] })
      .notNull()
      .default("weight"),
    targetSets: integer("target_sets").notNull().default(3),
    targetReps: integer("target_reps").notNull().default(10),
    targetSeconds: integer("target_seconds").notNull().default(600),
    // Last weight the user trained this movement with; prefilled next session.
    weightKg: real("weight_kg").notNull().default(20),
    notes: text("notes"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("plan_exercises_day_idx").on(t.dayId, t.position)],
);

export const customExercises = sqliteTable(
  "custom_exercises",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    equipment: text("equipment").notNull().default("other"),
    primaryMuscles: text("primary_muscles", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    groups: text("groups", { mode: "json" }).$type<string[]>().notNull().default([]),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("custom_exercises_user_idx").on(t.userId)],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayId: text("day_id").references(() => planDays.id, { onDelete: "set null" }),
    dayName: text("day_name").notNull(),
    dayKind: text("day_kind").notNull().default("full"),
    startedAt: integer("started_at").notNull(),
    // Null while the workout is still running.
    endedAt: integer("ended_at"),
    durationSec: integer("duration_sec").notNull().default(0),
    volumeKg: real("volume_kg").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    totalSets: integer("total_sets").notNull().default(0),
    totalReps: integer("total_reps").notNull().default(0),
  },
  (t) => [
    index("workouts_user_idx").on(t.userId, t.startedAt),
    index("workouts_active_idx").on(t.userId, t.endedAt),
  ],
);

export const workoutEntries = sqliteTable(
  "workout_entries",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    // Which plan row this came from, so the same movement twice in one day
    // tracks independently. Deliberately not a foreign key: history must
    // survive the plan row being deleted.
    planExerciseId: text("plan_exercise_id"),
    name: text("name").notNull(),
    trackingMode: text("tracking_mode", { enum: ["weight", "time"] })
      .notNull()
      .default("weight"),
    sets: integer("sets").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    seconds: integer("seconds").notNull().default(0),
    weightKg: real("weight_kg").notNull().default(0),
    volumeKg: real("volume_kg").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("workout_entries_workout_idx").on(t.workoutId, t.position),
    uniqueIndex("workout_entries_slot_unique").on(t.workoutId, t.planExerciseId),
    index("workout_entries_exercise_idx").on(t.exerciseId),
  ],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type PlanDay = typeof planDays.$inferSelect;
export type PlanExercise = typeof planExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutEntry = typeof workoutEntries.$inferSelect;
export type CustomExercise = typeof customExercises.$inferSelect;
