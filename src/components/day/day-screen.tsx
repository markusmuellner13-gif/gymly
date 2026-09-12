"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Minus,
  Play,
  Plus,
  Square,
  Timer,
  Trash2,
  Info,
  Pencil,
} from "lucide-react";
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  IconButton,
  Input,
  Sheet,
  cn,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { useElapsed } from "@/components/use-elapsed";
import { ExercisePicker } from "@/components/day/exercise-picker";
import {
  dayKindMeta,
  entryVolume,
  formatDuration,
  formatVolume,
  fromDisplayWeight,
  toDisplayWeight,
  type TrackingMode,
} from "@/lib/exercises";
import type { DayExerciseRow } from "@/lib/queries";
import {
  finishWorkoutAction,
  startWorkoutAction,
  toggleExerciseAction,
  setWorkingWeightAction,
} from "@/lib/actions/workout";
import { removeExerciseAction, addExercisesAction } from "@/lib/actions/plan";

type Units = "kg" | "lb";

export function DayScreen({
  day,
  initialRows,
  initialStartedAt,
  otherSession,
  units,
}: {
  day: { id: string; name: string; kind: string };
  initialRows: DayExerciseRow[];
  initialStartedAt: number | null;
  otherSession: { dayName: string; dayId: string | null } | null;
  units: Units;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [rows, setRows] = useState(initialRows);
  const [startedAt, setStartedAt] = useState<number | null>(initialStartedAt);
  const [picking, setPicking] = useState(false);
  const [details, setDetails] = useState<DayExerciseRow | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Edit mode swaps every tick box for a bin, so removing is one obvious tap. */
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<DayExerciseRow | null>(null);

  // Keep local state aligned when the server sends fresh data (navigation, revalidate).
  const signature = initialRows.map((r) => `${r.id}:${r.completed}:${r.weightKg}`).join("|");
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setRows(initialRows);
    }
  }, [signature, initialRows]);
  useEffect(() => setStartedAt(initialStartedAt), [initialStartedAt]);

  const seconds = useElapsed(startedAt);
  const meta = dayKindMeta(day.kind);
  const locked = Boolean(otherSession);

  const doneCount = rows.filter((r) => r.completed).length;
  const liveVolume = useMemo(
    () =>
      rows
        .filter((r) => r.completed)
        .reduce(
          (sum, r) => sum + entryVolume(r.trackingMode, r.weightKg, r.targetSets, r.targetReps),
          0,
        ),
    [rows],
  );
  const plannedVolume = useMemo(
    () =>
      rows.reduce(
        (sum, r) => sum + entryVolume(r.trackingMode, r.weightKg, r.targetSets, r.targetReps),
        0,
      ),
    [rows],
  );

  const patchRow = useCallback((id: string, patch: Partial<DayExerciseRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  /* ------------------------------ Session ------------------------------- */

  const start = async () => {
    if (locked) {
      toast(`Finish your ${otherSession?.dayName} session first.`, "error");
      return;
    }
    setBusy(true);
    const res = await startWorkoutAction(day.id);
    setBusy(false);
    if (!res.ok) return toast(res.error, "error");
    setStartedAt(res.data.startedAt);
    toast("Session started — go get it.", "success");
    startTransition(() => router.refresh());
  };

  const finish = async () => {
    setBusy(true);
    const res = await finishWorkoutAction();
    setBusy(false);
    setConfirmFinish(false);
    if (!res.ok) return toast(res.error, "error");
    setStartedAt(null);
    setRows((prev) => prev.map((r) => ({ ...r, completed: false })));
    toast(
      `Session logged — ${formatDuration(res.data.durationSec)} · ${formatVolume(res.data.volumeKg, units)} ${units}`,
      "success",
    );
    startTransition(() => router.refresh());
  };

  /* ------------------------------- Rows --------------------------------- */

  const toggle = async (row: DayExerciseRow) => {
    if (locked) {
      toast(`Finish your ${otherSession?.dayName} session first.`, "error");
      return;
    }
    const next = !row.completed;
    patchRow(row.id, { completed: next });
    if (next && navigator.vibrate) navigator.vibrate(12);

    const res = await toggleExerciseAction(row.id, next);
    if (!res.ok) {
      patchRow(row.id, { completed: row.completed });
      return toast(res.error, "error");
    }
    if (res.data.autoStarted) {
      setStartedAt(res.data.startedAt);
      toast("Timer started automatically.", "info");
    }
    startTransition(() => router.refresh());
  };

  // Weight edits are chatty; batch them so a long press on "+" is one write.
  const saveTimers = useRef(new Map<string, number>());
  const queueSave = useCallback(
    (row: DayExerciseRow, patch: { weightKg: number; sets: number; reps: number; seconds: number }) => {
      const timers = saveTimers.current;
      const existing = timers.get(row.id);
      if (existing) window.clearTimeout(existing);
      timers.set(
        row.id,
        window.setTimeout(async () => {
          timers.delete(row.id);
          const res = await setWorkingWeightAction(row.id, patch.weightKg, {
            sets: patch.sets,
            reps: patch.reps,
            seconds: patch.seconds,
          });
          if (!res.ok) toast(res.error, "error");
        }, 700),
      );
    },
    [toast],
  );

  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const adjustWeight = (row: DayExerciseRow, deltaDisplay: number) => {
    const current = toDisplayWeight(row.weightKg, units);
    const next = Math.max(0, Math.min(units === "kg" ? 1000 : 2200, current + deltaDisplay));
    const kg = fromDisplayWeight(Math.round(next * 100) / 100, units);
    patchRow(row.id, { weightKg: kg });
    queueSave({ ...row, weightKg: kg }, {
      weightKg: kg,
      sets: row.targetSets,
      reps: row.targetReps,
      seconds: row.targetSeconds,
    });
  };

  const saveTargets = async (
    row: DayExerciseRow,
    patch: { weightKg: number; targetSets: number; targetReps: number; targetSeconds: number },
  ) => {
    patchRow(row.id, patch);
    setDetails(null);
    const res = await setWorkingWeightAction(row.id, patch.weightKg, {
      sets: patch.targetSets,
      reps: patch.targetReps,
      seconds: patch.targetSeconds,
    });
    if (!res.ok) return toast(res.error, "error");
    startTransition(() => router.refresh());
  };

  const remove = async (row: DayExerciseRow) => {
    const remaining = rows.filter((r) => r.id !== row.id);
    setRows(remaining);
    if (!remaining.length) setEditing(false);
    setDetails(null);
    setConfirmRemove(null);
    try {
      await removeExerciseAction(row.id);
      toast(`${row.name} removed.`, "info");
      startTransition(() => router.refresh());
    } catch {
      toast("Could not remove that exercise.", "error");
      router.refresh();
    }
  };

  const addPicks = async (
    picks: { exerciseId: string; name: string; mode: TrackingMode }[],
  ) => {
    setPicking(false);
    if (!picks.length) return;
    try {
      await addExercisesAction(day.id, picks);
      toast(
        picks.length === 1 ? `${picks[0].name} added.` : `${picks.length} exercises added.`,
        "success",
      );
      startTransition(() => router.refresh());
    } catch {
      toast("Could not add those exercises.", "error");
    }
  };

  /* ------------------------------- Render -------------------------------- */

  const running = Boolean(startedAt);

  return (
    <main className="pt-safe">
      <header className="flex items-center gap-1 px-2 pt-3">
        <IconButton label="Back to plan" onClick={() => router.push("/plan")}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">
            {day.name}
          </h1>
          <p className="truncate text-[12px] text-faint">{meta.blurb}</p>
        </div>
        {rows.length > 0 ? (
          <IconButton
            label={editing ? "Done editing" : "Edit exercises"}
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
            className={editing ? "bg-surface-2 text-accent" : undefined}
          >
            {editing ? <Check size={20} strokeWidth={3} /> : <Pencil size={18} />}
          </IconButton>
        ) : null}
        <IconButton
          label="Add exercise"
          onClick={() => setPicking(true)}
          className="bg-surface-2 text-text"
        >
          <Plus size={20} />
        </IconButton>
      </header>

      {/* Sticky session bar: timer + accumulated load */}
      <div className="sticky top-0 z-40 mt-3 bg-base/90 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div
          className={cn(
            "card flex items-stretch gap-3 p-3 transition",
            running && "border-[color:var(--done-line)]",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-faint">
              <Timer size={13} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {running ? "Elapsed" : "Duration"}
              </span>
              {running ? <span className="animate-live size-1.5 rounded-full bg-done" /> : null}
            </div>
            <div
              className={cn(
                "tnum mt-1 font-mono text-[26px] font-bold leading-none tracking-tight",
                running ? "text-text" : "text-faint",
              )}
            >
              {formatDuration(seconds)}
            </div>
          </div>

          <div aria-hidden className="w-px shrink-0 bg-line" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-faint">
              <Dumbbell size={13} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {running ? "Lifted" : "Planned"}
              </span>
            </div>
            <div className="tnum mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-[26px] font-bold leading-none tracking-tight",
                  running && liveVolume > 0 ? "ember-text" : "text-faint",
                )}
              >
                {formatVolume(running ? liveVolume : plannedVolume, units)}
              </span>
              <span className="text-[12px] font-medium text-faint">{units}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || locked || rows.length === 0}
            onClick={() => (running ? setConfirmFinish(true) : start())}
            aria-label={running ? "Finish session" : "Start session"}
            className={cn(
              "no-select ring-focus grid size-[52px] shrink-0 place-items-center self-center rounded-2xl transition active:scale-95",
              "disabled:pointer-events-none disabled:opacity-40",
              running ? "bg-danger-dim text-danger" : "ember-fill text-white",
            )}
          >
            {running ? (
              <Square size={20} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>

        {locked ? (
          <p className="mt-2 rounded-lg bg-danger-dim px-3 py-2 text-[12px] text-danger">
            A {otherSession?.dayName} session is still running.{" "}
            {otherSession?.dayId ? (
              <Link href={`/plan/${otherSession.dayId}`} className="font-semibold underline">
                Finish it first
              </Link>
            ) : null}
          </p>
        ) : editing ? (
          <p className="mt-2 text-center text-[12px] text-faint">
            Tap the bin to take an exercise off this day
          </p>
        ) : rows.length > 0 ? (
          <p className="mt-2 text-center text-[12px] text-faint">
            {doneCount} of {rows.length} done
            {running ? "" : " · press play when you start"}
          </p>
        ) : null}
      </div>

      {/* Exercise list */}
      <div className="px-4">
        {rows.length === 0 ? (
          <div className="card mt-2">
            <EmptyState
              icon={<Dumbbell size={26} />}
              title="Nothing planned yet"
              body={`Add ${meta.label.toLowerCase()} exercises to this day and they will show up here every session.`}
              action={
                <Button onClick={() => setPicking(true)}>
                  <Plus size={17} /> Add exercise
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row, i) => (
              <ExerciseRow
                key={row.id}
                row={row}
                index={i + 1}
                units={units}
                disabled={locked}
                editing={editing}
                onToggle={() => toggle(row)}
                onAdjust={(d) => adjustWeight(row, d)}
                onOpen={() => setDetails(row)}
                onRemove={() => setConfirmRemove(row)}
              />
            ))}
          </ul>
        )}

        {rows.length > 0 ? (
          <Button variant="secondary" block className="mt-3" onClick={() => setPicking(true)}>
            <Plus size={17} /> Add exercise
          </Button>
        ) : null}
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        dayKind={day.kind}
        dayName={day.name}
        existingIds={rows.map((r) => r.exerciseId)}
        onAdd={addPicks}
      />

      <ExerciseDetailSheet
        row={details}
        units={units}
        onClose={() => setDetails(null)}
        onSave={saveTargets}
        onRemove={remove}
      />

      <ConfirmSheet
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={finish}
        loading={busy}
        danger={false}
        title="Finish this session?"
        body={`${formatDuration(seconds)} trained, ${doneCount} of ${rows.length} exercises done, ${formatVolume(liveVolume, units)} ${units} moved. This gets saved to your history.`}
        confirmLabel="Finish & save"
      />

      <ConfirmSheet
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && remove(confirmRemove)}
        title={confirmRemove ? `Remove ${confirmRemove.name}?` : "Remove exercise?"}
        body="It comes off this day only. You can add it back any time, and past sessions keep it."
        confirmLabel="Remove"
      />
    </main>
  );
}

/* ------------------------------- Exercise row ------------------------------- */

function ExerciseRow({
  row,
  index,
  units,
  disabled,
  editing,
  onToggle,
  onAdjust,
  onOpen,
  onRemove,
}: {
  row: DayExerciseRow;
  index: number;
  units: Units;
  disabled: boolean;
  editing: boolean;
  onToggle: () => void;
  onAdjust: (deltaDisplay: number) => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const done = row.completed;
  const isTime = row.trackingMode === "time";
  const step = units === "kg" ? 2.5 : 5;
  const display = toDisplayWeight(row.weightKg, units);
  const shown = Math.round(display * 10) / 10;

  return (
    <li
      className={cn(
        "card overflow-hidden transition-colors duration-200",
        done && "border-[color:var(--done-line)]",
      )}
      style={done ? { background: "var(--done-dim)" } : undefined}
    >
      <div className="flex items-start gap-2.5 p-3">
        <span
          className={cn(
            "tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold",
            done ? "bg-done text-black" : "bg-surface-2 text-faint",
          )}
        >
          {index}
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="ring-focus min-w-0 flex-1 text-left"
          aria-label={`Details and targets for ${row.name}`}
        >
          <span
            className={cn(
              "block text-[15px] font-semibold leading-snug",
              done && "text-done",
            )}
          >
            {row.name}
          </span>
          <span className="tnum mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
            {isTime ? (
              <span>{Math.round(row.targetSeconds / 60)} min target</span>
            ) : (
              <>
                <span>
                  {row.targetSets} × {row.targetReps}
                </span>
                {row.bestWeightKg && row.bestWeightKg > row.weightKg ? (
                  <span className="text-faint">
                    best {Math.round(toDisplayWeight(row.bestWeightKg, units) * 10) / 10} {units}
                  </span>
                ) : null}
              </>
            )}
          </span>
        </button>

        {editing ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${row.name} from this day`}
            className="ring-focus grid size-11 shrink-0 place-items-center rounded-xl border-2 border-[color:var(--danger)] bg-danger-dim text-danger transition active:scale-90"
          >
            <Trash2 size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={done}
            aria-label={done ? `Mark ${row.name} as not done` : `Mark ${row.name} as done`}
            className={cn(
              "ring-focus grid size-11 shrink-0 place-items-center rounded-xl border-2 transition active:scale-90",
              "disabled:pointer-events-none disabled:opacity-40",
              done
                ? "border-done bg-done text-black"
                : "border-line-strong text-faint hover:border-[color:var(--accent)] hover:text-accent",
            )}
          >
            <Check
              size={22}
              strokeWidth={3}
              className={done ? "animate-pop" : "opacity-25"}
            />
          </button>
        )}
      </div>

      {!isTime ? (
        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          <StepButton
            label={`Decrease weight for ${row.name}`}
            onClick={() => onAdjust(-step)}
            disabled={shown <= 0}
          >
            <Minus size={17} />
          </StepButton>

          <button
            type="button"
            onClick={onOpen}
            className="ring-focus tnum min-w-0 flex-1 rounded-lg py-1 text-center"
            aria-label={`Set weight for ${row.name}`}
          >
            <span className="text-[19px] font-bold tracking-tight">{shown}</span>
            <span className="ml-1 text-[12px] font-medium text-faint">{units}</span>
          </button>

          <StepButton label={`Increase weight for ${row.name}`} onClick={() => onAdjust(step)}>
            <Plus size={17} />
          </StepButton>
        </div>
      ) : null}
    </li>
  );
}

function StepButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="no-select ring-focus grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-text transition active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* ----------------------------- Detail / targets ----------------------------- */

function ExerciseDetailSheet({
  row,
  units,
  onClose,
  onSave,
  onRemove,
}: {
  row: DayExerciseRow | null;
  units: Units;
  onClose: () => void;
  onSave: (
    row: DayExerciseRow,
    patch: { weightKg: number; targetSets: number; targetReps: number; targetSeconds: number },
  ) => void;
  onRemove: (row: DayExerciseRow) => void;
}) {
  const [weight, setWeight] = useState("0");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [minutes, setMinutes] = useState("10");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  if (row && seed !== row.id) {
    setSeed(row.id);
    setWeight(String(Math.round(toDisplayWeight(row.weightKg, units) * 10) / 10));
    setSets(String(row.targetSets));
    setReps(String(row.targetReps));
    setMinutes(String(Math.max(1, Math.round(row.targetSeconds / 60))));
    setConfirmRemove(false);
  }

  if (!row) return null;
  const isTime = row.trackingMode === "time";

  const submit = () => {
    onSave(row, {
      weightKg: fromDisplayWeight(Number(weight) || 0, units),
      targetSets: Math.max(1, Number(sets) || 1),
      targetReps: Math.max(0, Number(reps) || 0),
      targetSeconds: Math.max(0, Math.round((Number(minutes) || 0) * 60)),
    });
  };

  const projected = entryVolume(
    row.trackingMode,
    fromDisplayWeight(Number(weight) || 0, units),
    Number(sets) || 0,
    Number(reps) || 0,
  );

  return (
    <>
      <Sheet open={Boolean(row)} onClose={onClose} title={row.name}>
        <div className="flex flex-col gap-4 p-4">
          {isTime ? (
            <Field label="Target duration" hint="minutes">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Field label="Weight" hint={units}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="text-center"
                  />
                </Field>
                <Field label="Sets">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="text-center"
                  />
                </Field>
                <Field label="Reps">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={200}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="text-center"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px]">
                <Info size={15} className="shrink-0 text-faint" />
                <span className="text-muted">
                  Counts as{" "}
                  <span className="tnum font-semibold text-text">
                    {formatVolume(projected, units)} {units}
                  </span>{" "}
                  toward this session.
                </span>
              </div>

              {row.bestWeightKg ? (
                <p className="-mt-1 text-[12px] text-faint">
                  Your best on this movement:{" "}
                  <span className="tnum font-semibold text-muted">
                    {Math.round(toDisplayWeight(row.bestWeightKg, units) * 10) / 10} {units}
                  </span>
                </p>
              ) : null}
            </>
          )}

          <Button block onClick={submit}>
            Save
          </Button>
          <Button variant="danger" block onClick={() => setConfirmRemove(true)}>
            <Trash2 size={16} /> Remove from this day
          </Button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => onRemove(row)}
        title={`Remove ${row.name}?`}
        body="It comes off this day only. You can add it back any time, and past sessions keep it."
        confirmLabel="Remove"
      />
    </>
  );
}
