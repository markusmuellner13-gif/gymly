import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSettings, users, workouts } from "@/lib/db/schema";
import { sendToUser, ensureWebPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the training reminders that are due.
 *
 * Runs on a schedule (see vercel.json). Everything it does is idempotent: a
 * user is skipped once they have already been reminded today in their own
 * timezone, so re-running the job never double-notifies anyone.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!ensureWebPush()) {
    return NextResponse.json({ skipped: "VAPID keys are not configured" });
  }

  const rows = await db()
    .select({ settings: userSettings, userId: users.id })
    .from(userSettings)
    .innerJoin(users, eq(users.id, userSettings.userId))
    .where(and(eq(userSettings.remindersEnabled, true), isNull(users.deletionRequestedAt)));

  const now = Date.now();
  let sent = 0;
  let skipped = 0;

  for (const { settings, userId } of rows) {
    const local = localParts(now, settings.timezone);

    // Already reminded today in the user's own calendar?
    if (settings.lastRemindedAt && localParts(settings.lastRemindedAt, settings.timezone).day === local.day) {
      skipped++;
      continue;
    }

    const isReminderDay = (settings.reminderDays ?? []).includes(local.weekday);
    const [hh, mm] = settings.reminderTime.split(":").map(Number);
    const dueMinutes = (hh || 0) * 60 + (mm || 0);
    const nowMinutes = local.hour * 60 + local.minute;

    const streakDay = settings.streakRemindersEnabled && nowMinutes >= 20 * 60;
    if (!isReminderDay && !streakDay) {
      skipped++;
      continue;
    }
    if (isReminderDay && nowMinutes < dueMinutes && !streakDay) {
      skipped++;
      continue;
    }

    // Nothing to nag about if they already trained today.
    const startOfLocalDay = startOfDayUtc(now, settings.timezone);
    const [trained] = await db()
      .select({ id: workouts.id })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          isNotNull(workouts.endedAt),
          gte(workouts.startedAt, startOfLocalDay),
        ),
      )
      .limit(1);
    if (trained) {
      skipped++;
      continue;
    }

    const payload = isReminderDay
      ? { title: "Time to train", body: "Your session is waiting. Open Gymly and press play." }
      : { title: "Keep the streak alive", body: "No session logged today — there is still time." };

    const result = await sendToUser(userId, { ...payload, url: "/plan", tag: "gymly-reminder" });
    if (result.sent > 0) {
      sent++;
      await db()
        .update(userSettings)
        .set({ lastRemindedAt: now })
        .where(eq(userSettings.userId, userId));
    }
  }

  return NextResponse.json({ checked: rows.length, sent, skipped });
}

function localParts(ts: number, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timezone),
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(ts)).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: weekdayMap[parts.weekday as string] ?? 0,
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
  };
}

/** Offset of a timezone from UTC at a given instant, in milliseconds. */
function tzOffsetMs(ts: number, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: safeZone(timezone),
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - ts;
}

/** Epoch ms of midnight today in the given timezone. */
function startOfDayUtc(ts: number, timezone: string) {
  const offset = tzOffsetMs(ts, timezone);
  const localMidnight = Math.floor((ts + offset) / 86_400_000) * 86_400_000;
  return localMidnight - offset;
}

function safeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}
