import { NextResponse, type NextRequest } from "next/server";
import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { DELETION_GRACE_DAYS, purgeUser } from "@/lib/account-lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Housekeeping: erases accounts whose recovery window has expired and drops
 * session rows that are no longer valid.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

  // Only accounts whose grace period has actually elapsed.
  const doomed = await db()
    .select({ id: users.id })
    .from(users)
    .where(
      and(isNotNull(users.deletionRequestedAt), lt(users.deletionRequestedAt, cutoff)),
    );

  for (const user of doomed) {
    await purgeUser(user.id);
  }

  const expired = await db().delete(sessions).where(lt(sessions.expiresAt, Date.now()));

  return NextResponse.json({
    erased: doomed.length,
    expiredSessions: expired.rowsAffected ?? 0,
    graceDays: DELETION_GRACE_DAYS,
  });
}
