// Applies the generated Drizzle migrations to the configured database.
//
//   node --env-file=.env.local scripts/migrate.mjs             # the main database
//   node --env-file=.env.preview.local scripts/migrate.mjs --preview
//
// With --preview it targets PREVIEW_TURSO_* instead, so the preview database
// can be migrated without ever pointing this script at production by accident.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const preview = process.argv.includes("--preview");

const url = preview
  ? process.env.PREVIEW_TURSO_DATABASE_URL
  : (process.env.TURSO_DATABASE_URL ?? "file:./local.db");
const authToken = preview
  ? process.env.PREVIEW_TURSO_AUTH_TOKEN
  : process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error(
    preview
      ? "PREVIEW_TURSO_DATABASE_URL is not set. Run: vercel env pull --environment=preview .env.preview.local"
      : "No database URL available.",
  );
  process.exit(1);
}

// Log the host only — never the token that follows it.
console.log(`Migrating ${preview ? "[preview] " : ""}${url.replace(/\?.*$/, "")} ...`);

const client = createClient({ url, authToken });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
client.close();
