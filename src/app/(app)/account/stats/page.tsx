import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trophy, Flame, Dumbbell } from "lucide-react";
import { getSettings, requireUser } from "@/lib/auth";
import { getAllTimeStats, getRecentWorkouts } from "@/lib/queries";
import {
  dayKindMeta,
  formatDuration,
  formatDurationLong,
  formatVolume,
  toDisplayWeight,
  LOCALE,
} from "@/lib/exercises";
import { formatDate } from "@/lib/format";
import { VolumeChart } from "@/components/account/volume-chart";
import { EmptyState } from "@/components/account/empty-stats";

export const metadata: Metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const [stats, recent] = await Promise.all([
    getAllTimeStats(user.id, settings.timezone),
    getRecentWorkouts(user.id, 10),
  ]);
  const units = settings.units;

  if (stats.sessions === 0) return <EmptyStatsPage />;

  const kindTotal = stats.byKind.reduce((s, k) => s + k.n, 0) || 1;

  return (
    <main className="px-4 pt-safe">
      <header className="flex items-center gap-1 pt-3">
        <Link
          href="/account"
          aria-label="Back to account"
          className="ring-focus grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="px-1 text-[19px] font-bold tracking-tight">All-time statistics</h1>
      </header>

      {/* Headline number */}
      <section className="card mt-4 p-5">
        <p className="text-[12px] font-bold uppercase tracking-wider text-faint">
          Total weight moved
        </p>
        <p className="tnum mt-2 flex items-baseline gap-2">
          <span className="ember-text text-[42px] font-bold leading-none tracking-tight">
            {formatVolume(stats.volumeKg, units)}
          </span>
          <span className="text-[16px] font-semibold text-muted">{units}</span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Across {stats.sessions} session{stats.sessions === 1 ? "" : "s"} and{" "}
          {stats.sets.toLocaleString(LOCALE)} sets since{" "}
          {stats.firstWorkoutAt ? formatDate(stats.firstWorkoutAt) : "you started"}.
        </p>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2.5">
        <Stat label="Time trained" value={formatDurationLong(stats.seconds)} />
        <Stat label="Average session" value={formatDuration(stats.avgSeconds)} />
        <Stat label="Current streak" value={`${stats.currentStreak} d`} accent={stats.currentStreak > 0} />
        <Stat label="Longest streak" value={`${stats.longestStreak} d`} />
        <Stat label="Total reps" value={stats.reps.toLocaleString(LOCALE)} />
        <Stat label="Training days" value={stats.activeDays.toString()} />
        <Stat label="This week" value={`${stats.sessionsThisWeek} sessions`} />
        <Stat label="Last 30 days" value={`${stats.sessionsThisMonth} sessions`} />
      </section>

      <Panel title="Volume per week">
        <VolumeChart weeks={stats.weekly} units={units} />
      </Panel>

      {stats.byKind.length ? (
        <Panel title="How your training splits">
          <ul className="flex flex-col gap-3">
            {stats.byKind.map((k) => {
              const meta = dayKindMeta(k.kind);
              const pct = Math.round((k.n / kindTotal) * 100);
              return (
                <li key={k.kind}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ background: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <span className="tnum text-muted">
                      {k.n} session{k.n === 1 ? "" : "s"} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, pct)}%`, background: meta.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {stats.personalRecords.length ? (
        <Panel title="Personal records" icon={<Trophy size={15} className="text-warn" />}>
          <ul className="divide-y divide-[color:var(--line)]">
            {stats.personalRecords.map((p) => (
              <li key={p.exerciseId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.name}</span>
                <span className="tnum shrink-0 text-[14px] font-bold">
                  {Math.round(toDisplayWeight(p.best, units) * 10) / 10}
                  <span className="ml-1 text-[11px] font-medium text-faint">{units}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {stats.topExercises.length ? (
        <Panel title="Most volume" icon={<Dumbbell size={15} className="text-accent" />}>
          <ul className="divide-y divide-[color:var(--line)]">
            {stats.topExercises.map((e) => (
              <li key={e.exerciseId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{e.name}</span>
                  <span className="tnum block text-[12px] text-faint">
                    {e.times} time{e.times === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="tnum shrink-0 text-[13.5px] font-semibold text-muted">
                  {formatVolume(e.volume, units)} {units}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Recent sessions">
        <ul className="divide-y divide-[color:var(--line)]">
          {recent.map((w) => {
            const meta = dayKindMeta(w.dayKind);
            return (
              <li key={w.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{w.dayName}</span>
                  <span className="block text-[12px] text-faint">{formatDate(w.startedAt)}</span>
                </span>
                <span className="tnum shrink-0 text-right">
                  <span className="block text-[13.5px] font-semibold">
                    {formatVolume(w.volumeKg, units)} {units}
                  </span>
                  <span className="block text-[12px] text-faint">
                    {formatDuration(w.durationSec)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <p className="py-6 text-center text-[12px] text-faint">
        <Flame size={13} className="mr-1 inline text-accent" />
        Volume is weight × sets × reps for every exercise you ticked off.
      </p>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-3.5 py-3">
      <p className="text-[11.5px] font-medium text-faint">{label}</p>
      <p
        className={`tnum mt-1 truncate text-[19px] font-bold tracking-tight ${accent ? "text-accent" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card mt-3 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-faint">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyStatsPage() {
  return (
    <main className="px-4 pt-safe">
      <header className="flex items-center gap-1 pt-3">
        <Link
          href="/account"
          aria-label="Back to account"
          className="ring-focus grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="px-1 text-[19px] font-bold tracking-tight">All-time statistics</h1>
      </header>
      <div className="card mt-4">
        <EmptyState />
      </div>
    </main>
  );
}
