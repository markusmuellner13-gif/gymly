import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions } from "./db/schema";

let configured = false;

/** Returns false when the deployment has no VAPID keys, so callers can skip. */
export function ensureWebPush() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@gymly.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Delivers a notification to every device a user has registered.
 * Endpoints the push service reports as gone are pruned as we go.
 */
export async function sendToUser(userId: string, payload: PushPayload) {
  if (!ensureWebPush()) return { sent: 0, removed: 0 };

  const subs = await db()
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let removed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 mean the browser dropped the subscription for good.
      if (status === 404 || status === 410) {
        await db().delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        removed++;
      }
    }
  }

  return { sent, removed };
}
