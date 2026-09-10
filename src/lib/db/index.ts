import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: Client | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

function resolveUrl() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  // Local development falls back to an on-disk SQLite file so the app runs
  // without any cloud credentials.
  if (process.env.NODE_ENV !== "production") return "file:./local.db";
  throw new Error(
    "TURSO_DATABASE_URL is not set. Add it in the Vercel project environment variables.",
  );
}

/**
 * Lazily created so importing this module never opens a connection during the
 * build, where the Turso credentials are not necessarily present.
 */
export function db() {
  if (!database) {
    client = createClient({
      url: resolveUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    database = drizzle(client, { schema });
  }
  return database;
}

export { schema };
