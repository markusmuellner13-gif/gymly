"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, X, ChevronRight } from "lucide-react";
import { Button, Chip, Input, Sheet, cn } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ExerciseDetailSheet } from "@/components/exercise-detail";
import { ExerciseThumb } from "@/components/exercise-thumb";
import {
  MUSCLE_LABEL,
  defaultTrackingMode,
  titleCase,
  type ExerciseGroup,
  type ExerciseIndexEntry,
} from "@/lib/exercises";
import { addExercisesAction } from "@/lib/actions/plan";

let cachedIndex: ExerciseIndexEntry[] | null = null;

async function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const mod = await import("@/data/exercise-index.json");
  cachedIndex = (mod.default ?? mod) as unknown as ExerciseIndexEntry[];
  return cachedIndex;
}

const SECTIONS: { key: ExerciseGroup; label: string; blurb: string; color: string }[] = [
  { key: "cardio", label: "Cardio", blurb: "Machines, running, rowing and conditioning", color: "#EF4444" },
  { key: "plyo", label: "Plyometrics", blurb: "Explosive jumps, throws and sprints", color: "#F59E0B" },
  { key: "stretching", label: "Stretching", blurb: "Static and dynamic mobility work", color: "#22D3EE" },
  { key: "smr", label: "Foam rolling", blurb: "Self-myofascial release", color: "#A855F7" },
];

export function CardioBrowser({
  days,
}: {
  days: { id: string; name: string; kind: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [index, setIndex] = useState<ExerciseIndexEntry[] | null>(cachedIndex);
  const [section, setSection] = useState<ExerciseGroup>("cardio");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<ExerciseIndexEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIndex().then((data) => {
      if (!cancelled) setIndex(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    return index
      .filter((e) => e.g.includes(section))
      .filter((e) =>
        !q ? true : e.n.toLowerCase().includes(q) || e.p.some((m) => m.includes(q)),
      );
  }, [index, section, query]);

  const current = SECTIONS.find((s) => s.key === section)!;

  const addToDay = async (entry: ExerciseIndexEntry, dayId: string, dayName: string) => {
    setAddTarget(null);
    try {
      await addExercisesAction(dayId, [
        { exerciseId: entry.i, name: entry.n, mode: defaultTrackingMode(entry.g) },
      ]);
      toast(`${entry.n} added to ${dayName}.`, "success");
      startTransition(() => router.refresh());
    } catch {
      toast("Could not add that exercise.", "error");
    }
  };

  return (
    <main className="px-4 pt-safe">
      <header className="pt-5">
        <h1 className="text-[27px] font-bold tracking-tight">Cardio &amp; stretching</h1>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          Conditioning and recovery work you can drop into any day of your plan.
        </p>
      </header>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {SECTIONS.map((s) => (
          <Chip
            key={s.key}
            active={section === s.key}
            color={s.color}
            onClick={() => {
              setSection(s.key);
              setQuery("");
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] text-faint">{current.blurb}</p>

      <div className="relative mt-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${current.label.toLowerCase()}`}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:text-text"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] text-faint">
        {index ? `${results.length} exercise${results.length === 1 ? "" : "s"}` : "Loading…"}
      </p>

      {!index ? (
        <div className="flex justify-center py-16 text-faint">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {results.map((e) => (
            <li key={e.i} className="card flex items-center">
              <button
                type="button"
                onClick={() => setDetailId(e.i)}
                className="ring-focus flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-2.5 pr-1 text-left"
              >
                <ExerciseThumb exerciseId={e.i} name={e.n} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{e.n}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium text-accent">
                    {e.p.length
                      ? e.p.map((m) => MUSCLE_LABEL[m] ?? titleCase(m)).join(" · ")
                      : "Full body"}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-faint">
                    {titleCase(e.e)}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Add ${e.n} to a day`}
                onClick={() => setAddTarget(e)}
                disabled={days.length === 0}
                className={cn(
                  "ring-focus mx-2 grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 transition active:scale-90",
                  "disabled:opacity-30",
                )}
              >
                <Plus size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {index && results.length === 0 ? (
        <p className="px-4 py-10 text-center text-[14px] text-muted">
          Nothing matches “{query}”.
        </p>
      ) : null}

      <ExerciseDetailSheet
        exerciseId={detailId}
        onClose={() => setDetailId(null)}
        footer={
          detailId && days.length ? (
            <Button
              block
              onClick={() => {
                const entry = results.find((r) => r.i === detailId) ?? null;
                setDetailId(null);
                setAddTarget(entry);
              }}
            >
              <Plus size={17} /> Add to a day
            </Button>
          ) : null
        }
      />

      <Sheet
        open={Boolean(addTarget)}
        onClose={() => setAddTarget(null)}
        title={addTarget ? `Add ${addTarget.n} to…` : ""}
      >
        <div className="flex flex-col p-2">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => addTarget && addToDay(addTarget, d.id, d.name)}
              className="ring-focus flex items-center justify-between rounded-xl px-3.5 py-3.5 text-left text-[15px] font-medium transition hover:bg-surface-2"
            >
              {d.name}
              <Plus size={17} className="text-muted" />
            </button>
          ))}
          {!days.length ? (
            <p className="px-3.5 py-6 text-center text-[14px] text-muted">
              Create a day on your plan first.
            </p>
          ) : null}
        </div>
      </Sheet>
    </main>
  );
}
