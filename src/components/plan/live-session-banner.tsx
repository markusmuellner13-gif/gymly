"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useElapsed } from "@/components/use-elapsed";
import { formatDuration } from "@/lib/exercises";

export function LiveSessionBanner({
  dayName,
  dayId,
  startedAt,
}: {
  dayName: string;
  dayId: string | null;
  startedAt: number;
}) {
  const seconds = useElapsed(startedAt);

  return (
    <Link
      href={dayId ? `/plan/${dayId}` : "/plan"}
      className="animate-rise mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: "var(--done-line)",
        background: "var(--done-dim)",
      }}
    >
      <span className="animate-live size-2.5 shrink-0 rounded-full bg-done" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{dayName} in progress</span>
        {/* The clock ticks on between the server render and hydration. */}
        <span suppressHydrationWarning className="tnum block text-[13px] text-muted">
          {formatDuration(seconds)} elapsed — tap to continue
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" />
    </Link>
  );
}
