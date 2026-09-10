"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Chip, Input, Sheet, cn } from "@/components/ui";
import {
  MUSCLE_LABEL,
  dayKindMeta,
  defaultTrackingMode,
  groupsForKind,
  titleCase,
  type ExerciseGroup,
  type ExerciseIndexEntry,
  type TrackingMode,
} from "@/lib/exercises";

let cachedIndex: ExerciseIndexEntry[] | null = null;

async function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const mod = await import("@/data/exercise-index.json");
  cachedIndex = (mod.default ?? mod) as unknown as ExerciseIndexEntry[];
  return cachedIndex;
}

export function ExercisePicker({
  open,
  onClose,
  dayKind,
  dayName,
  existingIds,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  dayKind: string;
  dayName: string;
  existingIds: string[];
  onAdd: (picks: { exerciseId: string; name: string; mode: TrackingMode }[]) => void;
}) {
  const [index, setIndex] = useState<ExerciseIndexEntry[] | null>(cachedIndex);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Map<string, ExerciseIndexEntry>>(new Map());

  const meta = dayKindMeta(dayKind);
  const kindGroups = useMemo(() => groupsForKind(dayKind), [dayKind]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadIndex().then((data) => {
      if (!cancelled) setIndex(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset the picker each time it opens so a previous selection never leaks.
  useEffect(() => {
    if (open) {
      setQuery("");
      setMuscle(null);
      setEquipment(null);
      setShowAll(false);
      setSelected(new Map());
    }
  }, [open]);

  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  /** Everything this day is allowed to offer, before search and chips. */
  const scoped = useMemo(() => {
    if (!index) return [];
    if (showAll) return index;
    const wanted = new Set<ExerciseGroup>(kindGroups);
    return index.filter((e) => e.g.some((g) => wanted.has(g)));
  }, [index, kindGroups, showAll]);

  const muscles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of scoped) for (const m of e.p) counts.set(m, (counts.get(m) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [scoped]);

  const equipmentList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of scoped) counts.set(e.e, (counts.get(e.e) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [scoped]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((e) => {
      if (muscle && !e.p.includes(muscle)) return false;
      if (equipment && e.e !== equipment) return false;
      if (!q) return true;
      return (
        e.n.toLowerCase().includes(q) ||
        e.p.some((m) => m.includes(q)) ||
        e.e.toLowerCase().includes(q)
      );
    });
  }, [scoped, query, muscle, equipment]);

  const toggle = (e: ExerciseIndexEntry) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(e.i)) next.delete(e.i);
      else next.set(e.i, e);
      return next;
    });
  };

  const submit = () => {
    onAdd(
      [...selected.values()].map((e) => ({
        exerciseId: e.i,
        name: e.n,
        mode: defaultTrackingMode(e.g),
      })),
    );
  };

  const filtersOn = Boolean(muscle || equipment || query);

  return (
    <Sheet open={open} onClose={onClose} title={`Add to ${dayName}`} full>
      <div className="flex h-full flex-col">
        {/* Search + filters */}
        <div className="shrink-0 border-b border-line bg-surface px-4 pb-3 pt-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={showAll ? "Search all 876 exercises" : `Search ${meta.label.toLowerCase()} exercises`}
              className="pl-9 pr-9"
              autoComplete="off"
              enterKeyHint="search"
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

          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4">
            <Chip active={!muscle} onClick={() => setMuscle(null)}>
              All muscles
            </Chip>
            {muscles.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                {MUSCLE_LABEL[m] ?? titleCase(m)}
              </Chip>
            ))}
          </div>

          <div className="no-scrollbar -mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4">
            <Chip active={!equipment} onClick={() => setEquipment(null)}>
              Any kit
            </Chip>
            {equipmentList.map((m) => (
              <Chip
                key={m}
                active={equipment === m}
                onClick={() => setEquipment(equipment === m ? null : m)}
              >
                {titleCase(m)}
              </Chip>
            ))}
          </div>
        </div>

        {/* Scope hint */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
          <p className="min-w-0 truncate text-[12px] text-faint">
            {showAll ? (
              <>Showing every exercise · {results.length}</>
            ) : (
              <>
                <span style={{ color: meta.color }} className="font-semibold">
                  {meta.label}
                </span>{" "}
                movements only · {results.length}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowAll((v) => !v);
              setMuscle(null);
              setEquipment(null);
            }}
            className="ring-focus flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-muted hover:text-text"
          >
            <SlidersHorizontal size={13} />
            {showAll ? `Just ${meta.label.toLowerCase()}` : "Show all"}
          </button>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!index ? (
            <div className="flex justify-center py-16 text-faint">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[15px] font-semibold">No matches</p>
              <p className="mt-1.5 text-[13px] text-muted">
                {filtersOn
                  ? "Try clearing a filter"
                  : "Nothing in this category"}
                {showAll ? "." : ", or tap “Show all” to search every exercise."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {results.map((e) => {
                const picked = selected.has(e.i);
                const already = existing.has(e.i);
                return (
                  <li key={e.i}>
                    <button
                      type="button"
                      onClick={() => toggle(e)}
                      className={cn(
                        "ring-focus flex w-full items-center gap-3 px-4 py-3 text-left transition",
                        picked ? "bg-surface-2" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[14.5px] font-semibold">{e.n}</span>
                          {already ? (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-faint ring-1 ring-[color:var(--line)]">
                              on day
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-faint">
                          {e.p.map((m) => MUSCLE_LABEL[m] ?? titleCase(m)).join(" · ")}
                          {" — "}
                          {titleCase(e.e)}
                          {e.l ? ` · ${titleCase(e.l)}` : ""}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg border-2 transition",
                          picked
                            ? "border-transparent ember-fill text-white"
                            : "border-line-strong text-transparent",
                        )}
                      >
                        <Check size={17} strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
          <Button
            block
            variant={selected.size === 0 ? "secondary" : "primary"}
            disabled={selected.size === 0}
            onClick={submit}
          >
            {selected.size === 0
              ? "Select exercises to add"
              : `Add ${selected.size} exercise${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
