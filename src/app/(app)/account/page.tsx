import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  FileText,
  Cookie,
  ShieldCheck,
  Settings2,
  Scale,
  Clock,
  Flame,
} from "lucide-react";
import { getSettings, requireUser } from "@/lib/auth";
import { getAllTimeStats } from "@/lib/queries";
import { formatVolume, formatDurationLong } from "@/lib/exercises";
import { Section, LinkRow } from "@/components/account/rows";
import { SignOutButton } from "@/components/account/sign-out-button";
import { InstallPrompt } from "@/components/account/install-prompt";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const stats = await getAllTimeStats(user.id, settings.timezone);

  const initial = (user.name?.trim()[0] ?? user.email[0]).toUpperCase();

  return (
    <main className="px-4 pt-safe">
      <header className="pt-5">
        <h1 className="text-[27px] font-bold tracking-tight">Account</h1>
      </header>

      <div className="card mt-4 flex items-center gap-3.5 p-4">
        <span className="ember-fill grid size-13 shrink-0 place-items-center rounded-2xl text-[22px] font-bold text-white">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">
            {user.name || "Athlete"}
          </span>
          <span className="block truncate text-[13px] text-muted">{user.email}</span>
        </span>
      </div>

      <section className="mt-4">
        <div className="grid grid-cols-3 gap-2.5">
          <Tile icon={<BarChart3 size={15} />} value={stats.sessions.toString()} label="sessions" />
          <Tile
            icon={<Scale size={15} />}
            value={formatVolume(stats.volumeKg, settings.units)}
            label={`${settings.units} lifted`}
            accent
          />
          <Tile
            icon={<Clock size={15} />}
            value={formatDurationLong(stats.seconds).replace(" min", "m").replace(" h", "h")}
            label="trained"
          />
        </div>
        <Link
          href="/account/stats"
          className="ring-focus mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 py-3 text-[14px] font-semibold transition hover:bg-surface-3"
        >
          <Flame size={16} className="text-accent" />
          All-time statistics
        </Link>
      </section>

      <Section title="Preferences">
        <LinkRow
          href="/account/settings"
          icon={<Settings2 size={18} />}
          label="Settings"
          value={settings.units.toUpperCase()}
        />
        <LinkRow
          href="/account/settings#notifications"
          icon={<Bell size={18} />}
          label="Push notifications"
          value={settings.remindersEnabled ? "On" : "Off"}
        />
      </Section>

      <Section
        title="Legal"
        note="Gymly is operated from Italy and follows Italian and EU law, including the GDPR (Reg. UE 2016/679) and the Codice del Consumo."
      >
        <LinkRow href="/legal/terms" icon={<FileText size={18} />} label="Terms of Service" />
        <LinkRow href="/legal/privacy" icon={<ShieldCheck size={18} />} label="Privacy Policy" />
        <LinkRow href="/legal/cookies" icon={<Cookie size={18} />} label="Cookie Policy" />
      </Section>

      <InstallPrompt />

      <div className="mt-7">
        <SignOutButton />
      </div>

      <p className="mb-2 mt-6 text-center text-[12px] text-faint">
        Gymly · Exercise data from{" "}
        <a
          href="https://github.com/yuhonas/free-exercise-db"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          free-exercise-db
        </a>{" "}
        (public domain)
      </p>
    </main>
  );
}

function Tile({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-3 py-3">
      <div className={accent ? "text-accent" : "text-faint"}>{icon}</div>
      <div className="tnum mt-1.5 truncate text-[20px] font-bold leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-1 truncate text-[11px] font-medium text-faint">{label}</div>
    </div>
  );
}
