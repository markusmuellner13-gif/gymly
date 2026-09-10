"use client";

import { useState } from "react";
import { formatVolume } from "@/lib/exercises";

export type WeekBucket = { label: string; volumeKg: number; sessions: number };

/**
 * Twelve weeks of training volume. One series, so no legend — the heading names
 * it. Only the peak week is labelled directly; the rest are on hover/focus.
 */
export function VolumeChart({
  weeks,
  units,
}: {
  weeks: WeekBucket[];
  units: "kg" | "lb";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...weeks.map((w) => w.volumeKg), 1);
  const peak = weeks.reduce((best, w, i) => (w.volumeKg > weeks[best].volumeKg ? i : best), 0);
  const active = hover ?? (weeks[peak].volumeKg > 0 ? peak : null);

  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]" role="img" aria-label="Weekly training volume for the last twelve weeks">
        {weeks.map((w, i) => {
          const pct = (w.volumeKg / max) * 100;
          const isActive = active === i;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => setHover(i)}
              aria-label={`Week of ${w.label}: ${formatVolume(w.volumeKg, units)} ${units} across ${w.sessions} sessions`}
              className="ring-focus group relative flex h-full flex-1 items-end rounded-sm"
            >
              <span
                className="w-full rounded-t transition-[height,background] duration-300"
                style={{
                  height: `${Math.max(w.volumeKg > 0 ? 4 : 2, pct)}%`,
                  background: isActive
                    ? "var(--accent)"
                    : w.volumeKg > 0
                      ? "var(--accent-lo)"
                      : "var(--surface-3)",
                  opacity: isActive || w.volumeKg === 0 ? 1 : 0.62,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
        <span className="text-[12px] text-faint">12 weeks ago</span>
        <span className="tnum text-[12.5px] font-medium text-muted">
          {active !== null ? (
            <>
              <span className="text-text">
                {formatVolume(weeks[active].volumeKg, units)} {units}
              </span>{" "}
              · {weeks[active].sessions} session{weeks[active].sessions === 1 ? "" : "s"}
            </>
          ) : (
            "No volume logged yet"
          )}
        </span>
        <span className="text-[12px] text-faint">now</span>
      </div>
    </div>
  );
}
