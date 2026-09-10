import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { sessions, users, userSettings, type User } from "./db/schema";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "gymly_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 days
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  // Lengths match by construction, but guard anyway: timingSafeEqual throws otherwise.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db().insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 255) ?? null,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Revokes every session for a user (used on password change and deletion). */
export async function destroyAllSessions(userId: string) {
  await db().delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Resolves the signed-in user. Cached for the lifetime of a single request so
 * a page and its nested layouts share one query.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db()
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, Date.now())))
    .limit(1);

  return rows[0]?.user ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    // Callers render under a layout that already redirects anonymous visitors,
    // so reaching here means the session vanished mid-request.
    redirect("/sign-in");
  }
  return user;
}

export const getSettings = cache(async (userId: string) => {
  const [row] = await db()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (row) return row;
  const created = { userId };
  await db().insert(userSettings).values(created).onConflictDoNothing();
  const [fresh] = await db()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return fresh;
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const newId = () => randomUUID();
