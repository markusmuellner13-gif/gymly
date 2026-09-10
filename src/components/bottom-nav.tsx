"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, HeartPulse, CircleUser } from "lucide-react";
import { cn } from "./ui";

const TABS = [
  { href: "/plan", label: "Plan", icon: CalendarDays, match: /^\/plan/ },
  { href: "/cardio", label: "Cardio", icon: HeartPulse, match: /^\/cardio/ },
  { href: "/account", label: "Account", icon: CircleUser, match: /^\/account/ },
];

export function BottomNav({ liveSession }: { liveSession?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="no-select fixed inset-x-0 bottom-0 z-50 border-t border-line bg-base/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-2xl items-stretch">
        {TABS.map((tab) => {
          const active = tab.match.test(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="ring-focus group relative flex flex-1 flex-col items-center justify-center gap-1 pt-1.5"
            >
              <span
                className={cn(
                  "relative grid size-9 place-items-center rounded-xl transition",
                  active ? "text-accent" : "text-faint group-hover:text-muted",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {tab.href === "/plan" && liveSession ? (
                  <span className="animate-live absolute right-1 top-1 size-2 rounded-full bg-done ring-2 ring-[color:var(--base)]" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-tight transition",
                  active ? "text-accent" : "text-faint group-hover:text-muted",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="pb-safe" />
    </nav>
  );
}
