import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Timer, Layers } from "lucide-react";
import { requireUser, getSettings } from "@/lib/auth";
import { getActiveWorkout, getPlanOverview, getWeekVolume, getAllTimeStats } from "@/lib/queries";
import { formatVolume, formatDurationLong } from "@/lib/exercises";
import { greeting } from "@/lib/format";
import { DayList } from "@/components/plan/day-list";
import { LiveSessionBanner } from "@/components/plan/live-session-banner";

export const metadata: Metadata = { title: "Training plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const [days, active, week, stats] = await Promise.all([
    getPlanOverview(user.id),
    getActiveWorkout(user.id),
    getWeekVolume(user.id),
    getAllTimeStats(user.id, settings.timezone),
  ]);

  const units = settings.units;
  const firstName = user.name?.split(" ")[0];

  return (
    <main className="px-4 pt-safe">
      <header className="pt-5">
        <p className="text-[13px] font-medium text-muted">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-0.5 text-[27px] font-bold tracking-tight">Your plan</h1>
      </header>

      <section className="mt-4 grid grid-cols-3 gap-2.5" aria-label="This week">
        <SummaryTile
          icon={<Flame size={15} />}
          value={stats.currentStreak.toString()}
          unit={stats.currentStreak === 1 ? "day streak" : "day streak"}
          accent
        />
        <SummaryTile
          icon={<Layers size={15} />}
          value={week.sessions.toString()}
          unit="this week"
        />
        <SummaryTile
          icon={<Timer size={15} />}
          value={formatVolume(week.volumeKg, units)}
          unit={`${units} moved`}
        />
      </section>

      {active ? (
        <LiveSessionBanner
          dayName={active.dayName}
          dayId={active.dayId}
          startedAt={active.startedAt}
        />
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">
            Days<span className="ml-2 text-[13px] font-normal text-faint">{days.length}</span>
          </h2>
          {stats.sessions > 0 ? (
            <Link
              href="/account/stats"
              className="text-[13px] font-medium text-muted hover:text-text"
            >
              {stats.sessions} session{stats.sessions === 1 ? "" : "s"} ·{" "}
              {formatDurationLong(stats.seconds)}
            </Link>
          ) : null}
        </div>

        <DayList
          days={days}
          units={units}
          activeDayId={active?.dayId ?? null}
        />
      </section>
    </main>
  );
}

function SummaryTile({
  icon,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-3 py-3">
      <div className={accent ? "text-accent" : "text-faint"}>{icon}</div>
      <div className="tnum mt-1.5 text-[20px] font-bold leading-none tracking-tight">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-faint">{unit}</div>
    </div>
  );
}
