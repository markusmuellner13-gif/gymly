/**
 * Proves that a Vercel preview deployment writes to the preview database and
 * never touches production. Signs up on the preview URL, then looks for that
 * account in both databases.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=.env.preview.local \
 *     scripts/preview-isolation-check.mjs <previewUrl> <protectionBypassToken>
 */
import { chromium, devices } from "playwright";
import { createClient } from "@libsql/client";

const [previewUrl, bypass] = process.argv.slice(2);
if (!previewUrl || !bypass) throw new Error("Pass the preview URL and the bypass token.");

const prod = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const preview = createClient({
  url: process.env.PREVIEW_TURSO_DATABASE_URL,
  authToken: process.env.PREVIEW_TURSO_AUTH_TOKEN,
});

let passed = 0;
let failed = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const countUsers = async (client, email) => {
  const r = await client.execute({
    sql: "select count(*) as n from users where email = ?",
    args: [email],
  });
  return Number(r.rows[0].n);
};

const email = `preview-check-${Date.now()}@example.com`;
const password = "correct-horse-8";

console.log(`\nPreview isolation check — ${previewUrl}\n`);

const prodBefore = (await prod.execute("select count(*) as n from users")).rows[0].n;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  colorScheme: "dark",
  extraHTTPHeaders: {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  },
});
const page = await ctx.newPage();

await page.goto(`${previewUrl}/sign-up`, { waitUntil: "networkidle" });
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password", { exact: false }).first().fill(password);
await page.locator('input[name="terms"]').check();
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL("**/plan", { timeout: 45000 });
ok("signed up on the preview deployment", page.url().endsWith("/plan"));

const dayLinks = page.getByRole("link", { name: /Push|Pull|Legs/ });
await dayLinks.first().waitFor({ state: "visible", timeout: 30000 });
ok("preview database was seeded with the starter plan", (await dayLinks.count()) >= 3);

await browser.close();

const inPreview = await countUsers(preview, email);
const inProd = await countUsers(prod, email);
const prodAfter = (await prod.execute("select count(*) as n from users")).rows[0].n;

ok("the account exists in the PREVIEW database", inPreview === 1, `found ${inPreview}`);
ok("the account does NOT exist in production", inProd === 0, `found ${inProd}`);
ok("production user count is unchanged", Number(prodAfter) === Number(prodBefore),
   `${prodBefore} -> ${prodAfter}`);

// Leave the preview database as we found it.
const [row] = (
  await preview.execute({ sql: "select id from users where email = ?", args: [email] })
).rows;
if (row) {
  const days = await preview.execute({
    sql: "select id from plan_days where user_id = ?",
    args: [row.id],
  });
  for (const d of days.rows) {
    await preview.execute({ sql: "delete from plan_exercises where day_id = ?", args: [d.id] });
  }
  await preview.execute({ sql: "delete from plan_days where user_id = ?", args: [row.id] });
  await preview.execute({ sql: "delete from sessions where user_id = ?", args: [row.id] });
  await preview.execute({ sql: "delete from user_settings where user_id = ?", args: [row.id] });
  await preview.execute({ sql: "delete from users where id = ?", args: [row.id] });
  console.log("  ....  cleaned the throwaway account out of the preview database");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
