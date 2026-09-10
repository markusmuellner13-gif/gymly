/**
 * End-to-end smoke test against a running production build.
 * Drives the real server actions over the RSC protocol and checks the database
 * afterwards, so the maths and the ownership guards are exercised for real.
 *
 * Usage: node scripts/e2e.mjs [baseUrl]
 */
import { readdirSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const BASE = process.argv[2] ?? "http://localhost:3111";
const db = createClient({ url: "file:./local.db" });

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

/* ---------------------- action id extraction ---------------------------- */

const ACTIONS = {};
for (const file of readdirSync(".next/static/chunks").filter((f) => f.endsWith(".js"))) {
  const src = readFileSync(`.next/static/chunks/${file}`, "utf8");
  const re = /"([a-f0-9]{40,})",[\w$.]+\.callServer,void 0,[\w$.]+\.findSourceMapURL,"(\w+)"/g;
  let m;
  while ((m = re.exec(src))) ACTIONS[m[2]] = m[1];
}

/* ------------------------------ http helpers ---------------------------- */

function jar() {
  const cookies = new Map();
  return {
    header: () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb(res) {
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const idx = pair.indexOf("=");
        cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
  };
}

async function get(path, cookies) {
  const res = await fetch(BASE + path, {
    headers: cookies ? { cookie: cookies.header() } : {},
    redirect: "manual",
  });
  cookies?.absorb(res);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

/** Invokes a server action exactly the way the browser runtime does. */
async function action(name, args, cookies, path = "/plan") {
  const id = ACTIONS[name];
  if (!id) throw new Error(`No action id found for ${name}`);
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Next-Action": id,
      "Content-Type": "text/plain;charset=UTF-8",
      cookie: cookies.header(),
    },
    body: JSON.stringify(args),
    redirect: "manual",
  });
  cookies.absorb(res);
  return { status: res.status, body: await res.text() };
}

async function signUp(email, password) {
  const cookies = jar();
  const page = await get("/sign-up", cookies);
  const fields = {};
  for (const m of page.body.matchAll(
    /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\s*\/>/g,
  )) {
    fields[m[1]] = (m[2] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("name", "Marco");
  form.append("email", email);
  form.append("password", password);
  form.append("terms", "on");

  const res = await fetch(BASE + "/sign-up", {
    method: "POST",
    headers: { cookie: cookies.header() },
    body: form,
    redirect: "manual",
  });
  cookies.absorb(res);
  await res.text();
  return { cookies, status: res.status };
}

/* --------------------------------- run ---------------------------------- */

console.log(`\nGymly end-to-end — ${BASE}`);
console.log(`Discovered ${Object.keys(ACTIONS).length} server actions\n`);

const stamp = Date.now();
const email = `e2e-${stamp}@example.com`;

console.log("Auth");
const { cookies, status: signUpStatus } = await signUp(email, "correct-horse-8");
ok("sign-up completes", signUpStatus === 303 || signUpStatus === 200, `status ${signUpStatus}`);
const userRow = await db.execute({ sql: "select id from users where email = ?", args: [email] });
ok("user row created", userRow.rows.length === 1);
const userId = userRow.rows[0]?.id;

const plan = await get("/plan", cookies);
ok("plan page renders for the new session", plan.status === 200, `status ${plan.status}`);
ok("starter split is seeded", /Push/.test(plan.body) && /Pull/.test(plan.body) && /Legs/.test(plan.body));

const days = await db.execute({
  sql: "select id, name, kind from plan_days where user_id = ? order by position",
  args: [userId],
});
ok("four starter days", days.rows.length === 4, `got ${days.rows.length}`);
const push = days.rows.find((d) => d.kind === "push");
const pull = days.rows.find((d) => d.kind === "pull");

const dayPage = await get(`/plan/${push.id}`, cookies);
ok("day page renders", dayPage.status === 200);
ok("day page lists a seeded exercise", /Barbell Bench Press/.test(dayPage.body));

const exercises = await db.execute({
  sql: "select id, name, weight_kg, target_sets, target_reps from plan_exercises where day_id = ? order by position",
  args: [push.id],
});
ok("push day has five exercises", exercises.rows.length === 5, `got ${exercises.rows.length}`);

console.log("\nWorkout lifecycle");
const start = await action("startWorkoutAction", [push.id], cookies, `/plan/${push.id}`);
ok("start workout returns 200", start.status === 200, `status ${start.status}`);
const running = await db.execute({
  sql: "select id, day_id, started_at, ended_at from workouts where user_id = ? and ended_at is null",
  args: [userId],
});
ok("an active workout exists", running.rows.length === 1);

const first = exercises.rows[0];
await action("toggleExerciseAction", [first.id, true], cookies, `/plan/${push.id}`);
const entry = await db.execute({
  sql: "select * from workout_entries where workout_id = ?",
  args: [running.rows[0].id],
});
ok("ticking an exercise creates one entry", entry.rows.length === 1);
const expectedVolume = first.weight_kg * first.target_sets * first.target_reps;
ok(
  "entry volume is weight x sets x reps",
  Math.abs(entry.rows[0].volume_kg - expectedVolume) < 0.001,
  `${entry.rows[0].volume_kg} vs ${expectedVolume}`,
);

// Un-tick must zero the volume without deleting history.
await action("toggleExerciseAction", [first.id, false], cookies, `/plan/${push.id}`);
const untoggled = await db.execute({
  sql: "select completed, volume_kg from workout_entries where workout_id = ?",
  args: [running.rows[0].id],
});
ok("un-ticking clears completion", untoggled.rows[0].completed === 0);
ok("un-ticking zeroes volume", untoggled.rows[0].volume_kg === 0);
ok("un-ticking does not duplicate the row", untoggled.rows.length === 1);

await action("toggleExerciseAction", [first.id, true], cookies, `/plan/${push.id}`);

// Changing the working weight must follow through to the live entry.
await action(
  "setWorkingWeightAction",
  [first.id, 77.5, { sets: 5, reps: 5 }],
  cookies,
  `/plan/${push.id}`,
);
const reweighted = await db.execute({
  sql: "select volume_kg, weight_kg, sets, reps from workout_entries where plan_exercise_id = ?",
  args: [first.id],
});
ok("weight change reaches the live entry", reweighted.rows[0].weight_kg === 77.5);
ok(
  "volume recalculates after a weight change",
  Math.abs(reweighted.rows[0].volume_kg - 77.5 * 5 * 5) < 0.001,
  `${reweighted.rows[0].volume_kg}`,
);
const planRow = await db.execute({
  sql: "select weight_kg from plan_exercises where id = ?",
  args: [first.id],
});
ok("weight sticks on the plan for next time", planRow.rows[0].weight_kg === 77.5);

// Second exercise, so the totals cover more than one row.
const second = exercises.rows[1];
await action("toggleExerciseAction", [second.id, true], cookies, `/plan/${push.id}`);

console.log("\nGuards");
const crossDay = await action("toggleExerciseAction", [
  (await db.execute({ sql: "select id from plan_exercises where day_id = ? limit 1", args: [pull.id] }))
    .rows[0].id,
  true,
], cookies, `/plan/${pull.id}`);
ok(
  "cannot tick another day while a session runs",
  /already running/i.test(crossDay.body),
  "expected a refusal message",
);

const stranger = await signUp(`e2e-other-${stamp}@example.com`, "correct-horse-8");
const steal = await action("deleteDayAction", [push.id], stranger.cookies, "/plan");
const stillThere = await db.execute({
  sql: "select id from plan_days where id = ?",
  args: [push.id],
});
ok("another user cannot delete your day", stillThere.rows.length === 1, `action status ${steal.status}`);

const anon = jar();
const anonPlan = await get("/plan", anon);
ok("anonymous visitor is redirected away from /plan", anonPlan.status === 307);

console.log("\nFinishing");
const finish = await action("finishWorkoutAction", [], cookies, `/plan/${push.id}`);
ok("finish returns 200", finish.status === 200, `status ${finish.status}`);
const done = await db.execute({
  sql: "select * from workouts where user_id = ? and ended_at is not null",
  args: [userId],
});
ok("workout is closed", done.rows.length === 1);
const secondVolume = second.weight_kg * second.target_sets * second.target_reps;
const expectedTotal = 77.5 * 5 * 5 + secondVolume;
ok(
  "session volume totals both exercises",
  Math.abs(done.rows[0].volume_kg - expectedTotal) < 0.001,
  `${done.rows[0].volume_kg} vs ${expectedTotal}`,
);
ok("completed count recorded", done.rows[0].completed_count === 2, `${done.rows[0].completed_count}`);
ok("total sets recorded", done.rows[0].total_sets === 5 + second.target_sets);
const noActive = await db.execute({
  sql: "select id from workouts where user_id = ? and ended_at is null",
  args: [userId],
});
ok("no session left running", noActive.rows.length === 0);

console.log("\nAdding and removing");
const before = (
  await db.execute({ sql: "select id from plan_exercises where day_id = ?", args: [push.id] })
).rows.length;
await action(
  "addExercisesAction",
  [push.id, [{ exerciseId: "Pushups", name: "Pushups", mode: "weight" }]],
  cookies,
  `/plan/${push.id}`,
);
const after = await db.execute({
  sql: "select id, name from plan_exercises where day_id = ? order by position",
  args: [push.id],
});
ok("exercise added to the day", after.rows.length === before + 1);
const added = after.rows.find((r) => r.name === "Pushups");
await action("removeExerciseAction", [added.id], cookies, `/plan/${push.id}`);
const afterRemove = await db.execute({
  sql: "select id from plan_exercises where day_id = ?",
  args: [push.id],
});
ok("exercise removed from the day", afterRemove.rows.length === before);
const historyKept = await db.execute({
  sql: "select id from workout_entries where plan_exercise_id = ?",
  args: [first.id],
});
ok("finished history survives plan edits", historyKept.rows.length === 1);

console.log("\nDays");
await action("createDayAction", ["Arms", "upper"], cookies, "/plan");
const withNew = await db.execute({
  sql: "select id, name from plan_days where user_id = ? order by position",
  args: [userId],
});
ok("day created", withNew.rows.some((d) => d.name === "Arms"));
const armsId = withNew.rows.find((d) => d.name === "Arms").id;
await action("updateDayAction", [armsId, "Arm day", "pull"], cookies, "/plan");
const renamed = await db.execute({
  sql: "select name, kind from plan_days where id = ?",
  args: [armsId],
});
ok("day renamed and retyped", renamed.rows[0].name === "Arm day" && renamed.rows[0].kind === "pull");
await action("duplicateDayAction", [push.id], cookies, "/plan");
const dupe = await db.execute({
  sql: "select id from plan_days where user_id = ? and name like '%copy%'",
  args: [userId],
});
ok("day duplicated", dupe.rows.length === 1);
const dupeExercises = await db.execute({
  sql: "select id from plan_exercises where day_id = ?",
  args: [dupe.rows[0]?.id],
});
ok("duplicate carries its exercises", dupeExercises.rows.length === before);
await action("deleteDayAction", [armsId], cookies, "/plan");
const afterDelete = await db.execute({
  sql: "select id from plan_days where id = ?",
  args: [armsId],
});
ok("day deleted", afterDelete.rows.length === 0);

console.log("\nPages and settings");
for (const path of ["/plan", "/cardio", "/account", "/account/stats", "/account/settings"]) {
  const res = await get(path, cookies);
  ok(`${path} renders`, res.status === 200, `status ${res.status}`);
}
const statsPage = await get("/account/stats", cookies);
ok("stats page shows the session", /Total weight moved/.test(statsPage.body));
ok("stats page shows a personal record", /Personal records/.test(statsPage.body));

await action("updateSettingsAction", [{ units: "lb" }], cookies, "/account/settings");
const lbPlan = await get("/plan", cookies);
ok("unit switch reaches the plan screen", /\blb\b/.test(lbPlan.body));
await action("updateSettingsAction", [{ units: "kg" }], cookies, "/account/settings");

const exported = await action("exportDataAction", [], cookies, "/account/settings");
ok("data export includes the account email", exported.body.includes(email));
ok("data export includes workouts", /workoutEntries/.test(exported.body));

console.log("\nDeletion");
await action("deleteAccountNowAction", ["correct-horse-8"], stranger.cookies, "/account/settings");
const strangerRow = await db.execute({
  sql: "select id from users where email = ?",
  args: [`e2e-other-${stamp}@example.com`],
});
ok("immediate deletion removes the user", strangerRow.rows.length === 0);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
