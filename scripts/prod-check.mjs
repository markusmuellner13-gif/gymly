/**
 * Drives the deployed app in a real browser: sign up, train, finish, check the
 * statistics, then delete the throwaway account so production stays clean.
 *
 * Usage: node scripts/prod-check.mjs https://your-deployment.vercel.app
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2];
if (!BASE) throw new Error("Pass the deployment URL.");
mkdirSync("shots/prod", { recursive: true });

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

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: "dark" });
const page = await ctx.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("response", (r) => {
  if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
});

const email = `prod-check-${Date.now()}@example.com`;
const password = "correct-horse-8";

console.log(`\nProduction check — ${BASE}\n`);

console.log("Sign up");
await page.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
await page.getByLabel("Name").fill("Marco");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password", { exact: false }).first().fill(password);
await page.locator('input[name="terms"]').check();
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL("**/plan", { timeout: 45000 });
ok("account created and landed on the plan", page.url().endsWith("/plan"));
const dayLinks = page.getByRole("link", { name: /Push|Pull|Legs/ });
await dayLinks.first().waitFor({ state: "visible", timeout: 30000 });
ok("starter split is seeded", (await dayLinks.count()) >= 3, `found ${await dayLinks.count()}`);

console.log("\nTrain a session");
await page.getByRole("link", { name: /Push/ }).first().click();
await page.waitForURL(/\/plan\/[0-9a-f-]+/, { timeout: 30000 });
await page.waitForLoadState("networkidle");
// The route shows a skeleton first, so wait for the list itself rather than
// sampling the page the instant navigation settles.
const firstExercise = page.getByRole("button", { name: /Details and targets for/ }).first();
await firstExercise.waitFor({ state: "visible", timeout: 30000 });
ok("day screen opened with its exercises", await firstExercise.isVisible());

await page.getByRole("button", { name: "Start session" }).click();
await page.waitForTimeout(1500);
ok("timer switched to elapsed", await page.getByText("ELAPSED").isVisible());

// Raise the working weight, then tick the first two exercises off.
const plus = page.getByRole("button", { name: /^Increase weight for/ }).first();
await plus.click();
await plus.click();
await page.waitForTimeout(1500);

const boxes = page.getByRole("button", { name: /^Mark .* as done$/ });
await boxes.first().click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /^Mark .* as done$/ }).first().click();
await page.waitForTimeout(1800);

const barText = await page.locator("main").innerText();
const liftedRaw = (barText.match(/LIFTED\s*([\d.,]+)/) ?? [])[1] ?? "";
const lifted = Number(liftedRaw.replace(/[^0-9]/g, ""));
ok("session volume is climbing", lifted > 0, `session bar read "${liftedRaw}"`);
ok("two exercises are ticked", await page.getByText("2 of 5 done").isVisible());
await page.screenshot({ path: "shots/prod/01-session.png" });

console.log("\nReload mid-session");
await page.reload({ waitUntil: "networkidle" });
ok("session survives a reload", await page.getByText("ELAPSED").isVisible());
ok("ticks survive a reload", await page.getByText("2 of 5 done").isVisible());

console.log("\nFinish");
await page.getByRole("button", { name: "Finish session" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Finish & save" }).click();
await page.waitForTimeout(3000);
ok("timer reset after finishing", await page.getByText("DURATION").isVisible());

console.log("\nStatistics");
await page.goto(`${BASE}/account/stats`, { waitUntil: "networkidle" });
ok("stats page shows the total", await page.getByText("Total weight moved").isVisible());
ok("personal records recorded", await page.getByText("Personal records").isVisible());
const statsText = await page.locator("main").innerText();
const totalKg = (statsText.match(/Total weight moved\s*([\d.,]+)/i) ?? [])[1] ?? "";
ok("total weight moved is non-zero", /[1-9]/.test(totalKg), `stats read "${totalKg}"`);
await page.screenshot({ path: "shots/prod/02-stats.png", fullPage: true });

console.log("\nOther tabs");
await page.goto(`${BASE}/cardio`, { waitUntil: "networkidle" });
ok("cardio tab lists exercises", await page.getByText("Jogging, Treadmill").isVisible());
await page.goto(`${BASE}/account/settings`, { waitUntil: "networkidle" });
ok("settings page loads", await page.getByText("Training reminders").isVisible());
ok(
  "push is configured on this deployment",
  !(await page.getByText("Not configured on this deployment").isVisible()),
);

console.log("\nManifest and service worker");
const manifest = await (await ctx.request.get(`${BASE}/manifest.webmanifest`)).json();
ok("manifest start_url is the plan", manifest.start_url === "/plan");
ok("manifest declares maskable icons", manifest.icons.some((i) => i.purpose === "maskable"));
const sw = await (await ctx.request.get(`${BASE}/sw.js`)).text();
ok("service worker handles push", sw.includes('addEventListener("push"'));

console.log("\nClean up");
await page.getByRole("button", { name: "Delete my account" }).click();
await page.waitForTimeout(600);
await page.locator('input[type="checkbox"]').check();
await page.getByLabel("Confirm with your password").fill(password);
await page.getByRole("button", { name: "Delete permanently" }).click();
await page.waitForTimeout(4000);
const gone = await ctx.request.get(`${BASE}/plan`, { maxRedirects: 0 });
ok("test account removed and session ended", gone.status() === 307, `status ${gone.status()}`);

ok("no browser or server errors", problems.length === 0, problems.slice(0, 4).join(" | "));

await browser.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
