import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Timer, Dumbbell, HeartPulse } from "lucide-react";
import { Wordmark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Gymly — Your training, tracked",
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Your split, your way",
    body: "Build push, pull, legs — or any day you like. Each day only offers the exercises that belong in it.",
  },
  {
    icon: Dumbbell,
    title: "Every kilo counts",
    body: "Set your working weight, tick the exercise off, and watch the total load of the session add up live.",
  },
  {
    icon: Timer,
    title: "Time the session",
    body: "Press play when you walk in, stop when you leave. Duration, volume and streaks land in your history.",
  },
  {
    icon: HeartPulse,
    title: "Cardio and mobility too",
    body: "876 exercises including conditioning, plyometrics, stretching and foam rolling.",
  },
];

export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-safe">
      <header className="pt-8">
        <Wordmark size={36} />
      </header>

      <section className="pt-12">
        <h1 className="text-[38px] font-bold leading-[1.05] tracking-tight">
          Your training,
          <br />
          <span className="ember-text">tracked.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          A gym log that stays out of the way. Plan your week, log every set, and see the
          weight you have moved — session after session.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/sign-up"
            className="ember-fill ring-focus flex h-13 items-center justify-center rounded-2xl px-5 text-base font-semibold text-white transition active:scale-[0.98]"
          >
            Start training free
          </Link>
          <Link
            href="/sign-in"
            className="ring-focus flex h-13 items-center justify-center rounded-2xl border border-line bg-surface-2 px-5 text-base font-semibold transition active:scale-[0.98]"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mt-14 flex flex-col gap-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="card flex gap-3.5 p-4">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{f.title}</span>
                <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">
                  {f.body}
                </span>
              </span>
            </div>
          );
        })}
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12.5px] text-faint">
        <Link href="/legal/terms" className="hover:text-muted">
          Terms
        </Link>
        <Link href="/legal/privacy" className="hover:text-muted">
          Privacy
        </Link>
        <Link href="/legal/cookies" className="hover:text-muted">
          Cookies
        </Link>
        <span className="w-full text-center text-faint">
          © {new Date().getFullYear()} Gymly
        </span>
      </footer>
    </main>
  );
}
