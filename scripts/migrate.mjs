// Applies the generated Drizzle migrations to the configured database.
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const db = drizzle(client);

console.log(`Migrating ${url.replace(/\?.*$/, "")} ...`);
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
client.close();
