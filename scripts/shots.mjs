/**
 * Captures the app on a phone-sized viewport so the layout can be reviewed.
 * Usage: node scripts/shots.mjs [baseUrl] [outDir]
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";

const BASE = process.argv[2] ?? "http://localhost:3111";
const OUT = process.argv[3] ?? "shots";
mkdirSync(OUT, { recursive: true });

const db = createClient({ url: "file:./local.db" });
const row = await db.execute(
  "select id from users where email like 'e2e-%' order by created_at desc limit 1",
);
const userId = row.rows[0]?.id;
if (!userId) throw new Error("Run scripts/e2e.mjs first to create a test account.");

const day = await db.execute({
  sql: "select id from plan_days where user_id = ? and kind = 'push' limit 1",
  args: [userId],
});
const dayId = day.rows[0].id;

const browser = await chromium.launch();

async function shoot(label, path, opts = {}) {
  const context = await browser.newContext({
    ...(opts.device ?? devices["iPhone 13"]),
    colorScheme: opts.scheme ?? "dark",
  });
  if (!opts.anonymous) {
    // Mint a session directly rather than re-typing the sign-in form.
    const token = "e2e-visual-token";
    const hash = await import("node:crypto").then((c) =>
      c.createHash("sha256").update(token).digest("hex"),
    );
    await db.execute({
      sql: "insert or replace into sessions (id, user_id, created_at, expires_at) values (?, ?, ?, ?)",
      args: [hash, userId, Date.now(), Date.now() + 864e5],
    });
    await context.addCookies([
      {
        name: "gymly_session",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);
  }
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (opts.act) await opts.act(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: opts.full ?? false });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.close();
  console.log(`  ${label}.png`);
}

console.log("Capturing:");
await shoot("01-welcome", "/welcome", { anonymous: true, full: true });
await shoot("02-signin", "/sign-in", { anonymous: true });
await shoot("03-plan", "/plan");
await shoot("04-day", `/plan/${dayId}`);
await shoot("05-picker", `/plan/${dayId}`, {
  act: async (page) => {
    await page.getByLabel("Add exercise").first().click();
    await page.waitForTimeout(700);
  },
});
await shoot("06-detail", `/plan/${dayId}`, {
  act: async (page) => {
    await page.getByRole("button", { name: /Details and targets/ }).first().click();
    await page.waitForTimeout(500);
  },
});
await shoot("07-cardio", "/cardio");
await shoot("08-account", "/account", { full: true });
await shoot("09-stats", "/account/stats", { full: true });
await shoot("10-settings", "/account/settings", { full: true });
await shoot("11-terms", "/legal/terms");
await shoot("12-plan-light", "/plan", { scheme: "light" });
await shoot("13-day-light", `/plan/${dayId}`, { scheme: "light" });
await shoot("14-plan-tablet", "/plan", { device: devices["iPad Mini"] });
await shoot("15-plan-desktop", "/plan", {
  device: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
});
await shoot("16-plan-small", "/plan", {
  device: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

await browser.close();
console.log("Done.");
