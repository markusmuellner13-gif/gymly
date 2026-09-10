"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions, userSettings } from "@/lib/db/schema";
import { newId, requireUser } from "@/lib/auth";
import { sendToUser } from "@/lib/push";
import type { ActionResult } from "@/lib/actions/workout";

export async function savePushSubscriptionAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!sub.endpoint || !sub.p256dh || !sub.auth) {
    return { ok: false, error: "That subscription is incomplete." };
  }

  await db()
    .insert(pushSubscriptions)
    .values({
      id: newId(),
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      // Re-subscribing on a device that changed hands must move the record.
      set: { userId: user.id, p256dh: sub.p256dh, auth: sub.auth },
    });

  await db()
    .update(userSettings)
    .set({ remindersEnabled: true, updatedAt: Date.now() })
    .where(eq(userSettings.userId, user.id));

  return { ok: true, data: null };
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResult<null>> {
  const user = await requireUser();
  await db()
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)),
    );

  const remaining = await db()
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id));

  if (!remaining.length) {
    await db()
      .update(userSettings)
      .set({ remindersEnabled: false, updatedAt: Date.now() })
      .where(eq(userSettings.userId, user.id));
  }

  return { ok: true, data: null };
}

export async function sendTestNotificationAction(): Promise<ActionResult<null>> {
  const user = await requireUser();
  const res = await sendToUser(user.id, {
    title: "Gymly",
    body: "Notifications are working. Time to train.",
    url: "/plan",
    tag: "gymly-test",
  });
  if (res.sent === 0) {
    return { ok: false, error: "No device is registered for notifications yet." };
  }
  return { ok: true, data: null };
}
