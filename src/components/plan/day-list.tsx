"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  CalendarPlus,
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
import { DAY_KINDS, dayKindMeta, formatVolume } from "@/lib/exercises";
import { relativeDay } from "@/lib/format";
import type { PlanDaySummary } from "@/lib/queries";
import {
  createDayAction,
  deleteDayAction,
  duplicateDayAction,
  reorderDaysAction,
  updateDayAction,
} from "@/lib/actions/plan";

type Units = "kg" | "lb";

export function DayList({
  days,
  units,
  activeDayId,
}: {
  days: PlanDaySummary[];
  units: Units;
  activeDayId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [actionsFor, setActionsFor] = useState<PlanDaySummary | null>(null);
  const [editing, setEditing] = useState<PlanDaySummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlanDaySummary | null>(null);

  const run = (fn: () => Promise<unknown>, done?: () => void) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        done?.();
      } catch {
        toast("Something went wrong. Try again.", "error");
      }
    });

  const move = (day: PlanDaySummary, delta: number) => {
    const ids = days.map((d) => d.id);
    const from = ids.indexOf(day.id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setActionsFor(null);
    run(() => reorderDaysAction(ids));
  };

  if (!days.length) {
    return (
      <>
        <div className="card">
          <EmptyState
            icon={<CalendarPlus size={26} />}
            title="No training days yet"
            body="Create your first day — Push, Pull, Legs or anything you like — then fill it with exercises."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus size={17} /> Add a day
              </Button>
            }
          />
        </div>
        <CreateDaySheet
          open={creating}
          onClose={() => setCreating(false)}
          pending={pending}
          onCreate={(name, kind) =>
            run(
              async () => {
                const res = await createDayAction(name, kind);
                router.push(`/plan/${res.id}`);
              },
              () => setCreating(false),
            )
          }
        />
      </>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {days.map((day) => {
          const meta = dayKindMeta(day.kind);
          const last = relativeDay(day.lastTrainedAt);
          const live = activeDayId === day.id;
          return (
            <li key={day.id} className="relative">
              <div
                className={cn(
                  "card flex items-stretch overflow-hidden transition",
                  live && "border-[color:var(--done-line)]",
                )}
              >
                <span
                  aria-hidden
                  className="w-1 shrink-0"
                  style={{ background: meta.color }}
                />
                <Link
                  href={`/plan/${day.id}`}
                  className="ring-focus min-w-0 flex-1 py-3.5 pl-3.5 pr-1"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-semibold">{day.name}</span>
                    {day.name.trim().toLowerCase() !== meta.label.toLowerCase() ? (
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: `${meta.color}22`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    ) : null}
                    {live ? (
                      <span className="animate-live size-2 shrink-0 rounded-full bg-done" />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-[13px] text-muted">
                    {day.exerciseCount === 0
                      ? "No exercises yet"
                      : `${day.exerciseCount} exercise${day.exerciseCount === 1 ? "" : "s"}`}
                    {day.plannedVolumeKg > 0
                      ? ` · ${formatVolume(day.plannedVolumeKg, units)} ${units} planned`
                      : ""}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-faint">
                    {last ? `Last trained ${last.toLowerCase()}` : "Not trained yet"}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
                  <IconButton label={`Options for ${day.name}`} onClick={() => setActionsFor(day)}>
                    <MoreHorizontal size={19} />
                  </IconButton>
                  <ChevronRight size={17} className="mr-1 text-faint" aria-hidden />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="secondary"
        block
        className="mt-3"
        onClick={() => setCreating(true)}
      >
        <Plus size={17} /> Add day
      </Button>

      {/* Per-day actions */}
      <Sheet
        open={Boolean(actionsFor)}
        onClose={() => setActionsFor(null)}
        title={actionsFor?.name ?? ""}
      >
        {actionsFor ? (
          <div className="flex flex-col p-2">
            <SheetAction
              icon={<Pencil size={18} />}
              label="Rename & change type"
              onClick={() => {
                setEditing(actionsFor);
                setActionsFor(null);
              }}
            />
            <SheetAction
              icon={<Copy size={18} />}
              label="Duplicate day"
              onClick={() =>
                run(() => duplicateDayAction(actionsFor.id), () => setActionsFor(null))
              }
            />
            <SheetAction
              icon={<ArrowUp size={18} />}
              label="Move up"
              disabled={days[0]?.id === actionsFor.id}
              onClick={() => move(actionsFor, -1)}
            />
            <SheetAction
              icon={<ArrowDown size={18} />}
              label="Move down"
              disabled={days[days.length - 1]?.id === actionsFor.id}
              onClick={() => move(actionsFor, 1)}
            />
            <SheetAction
              icon={<Trash2 size={18} />}
              label="Delete day"
              danger
              onClick={() => {
                setConfirmDelete(actionsFor);
                setActionsFor(null);
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <CreateDaySheet
        open={creating}
        onClose={() => setCreating(false)}
        pending={pending}
        onCreate={(name, kind) =>
          run(
            async () => {
              const res = await createDayAction(name, kind);
              router.push(`/plan/${res.id}`);
            },
            () => setCreating(false),
          )
        }
      />

      <CreateDaySheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        pending={pending}
        initialName={editing?.name}
        initialKind={editing?.kind}
        submitLabel="Save changes"
        title="Edit day"
        onCreate={(name, kind) =>
          editing
            ? run(() => updateDayAction(editing.id, name, kind), () => setEditing(null))
            : undefined
        }
      />

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        loading={pending}
        title={`Delete ${confirmDelete?.name}?`}
        body="The day and its exercises will be removed from your plan. Sessions you already logged stay in your history."
        confirmLabel="Delete day"
        onConfirm={() =>
          confirmDelete
            ? run(() => deleteDayAction(confirmDelete.id), () => setConfirmDelete(null))
            : undefined
        }
      />
    </>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "ring-focus flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-left text-[15px] font-medium transition",
        "disabled:opacity-35",
        danger ? "text-danger hover:bg-danger-dim" : "hover:bg-surface-2",
      )}
    >
      <span className={danger ? "text-danger" : "text-muted"}>{icon}</span>
      {label}
    </button>
  );
}

function CreateDaySheet({
  open,
  onClose,
  onCreate,
  pending,
  initialName,
  initialKind,
  title = "New training day",
  submitLabel = "Create day",
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, kind: string) => void;
  pending: boolean;
  initialName?: string;
  initialKind?: string;
  title?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [kind, setKind] = useState(initialKind ?? "push");
  const [touchedName, setTouchedName] = useState(Boolean(initialName));

  // Re-seed the form each time the sheet opens for a different day.
  const [seed, setSeed] = useState<string | undefined>(undefined);
  const key = `${open}-${initialName ?? ""}-${initialKind ?? ""}`;
  if (seed !== key) {
    setSeed(key);
    setName(initialName ?? "");
    setKind(initialKind ?? "push");
    setTouchedName(Boolean(initialName));
  }

  const pickKind = (k: string) => {
    setKind(k);
    // Until the user types their own label, the name follows the type.
    if (!touchedName) setName(dayKindMeta(k).label);
  };

  const effectiveName = name.trim() || dayKindMeta(kind).label;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5 p-4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Focus</p>
          <div className="grid grid-cols-2 gap-2">
            {DAY_KINDS.map((k) => {
              const active = kind === k.kind;
              return (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => pickKind(k.kind)}
                  className={cn(
                    "ring-focus rounded-xl border p-3 text-left transition active:scale-[0.98]",
                    active ? "bg-surface-2" : "border-line hover:bg-surface-2",
                  )}
                  style={active ? { borderColor: k.color } : undefined}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: k.color }}
                    />
                    <span className="text-[14px] font-semibold">{k.label}</span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-faint">
                    {k.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Name" hint="Shown on your plan">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTouchedName(true);
            }}
            placeholder={dayKindMeta(kind).label}
            maxLength={40}
          />
        </Field>

        <p className="-mt-2 text-[12px] leading-relaxed text-faint">
          The <span className="font-semibold text-muted">+</span> button on this day will offer{" "}
          {dayKindMeta(kind).blurb.toLowerCase()} exercises first.
        </p>

        <Button block loading={pending} onClick={() => onCreate(effectiveName, kind)}>
          {submitLabel}
        </Button>
      </div>
    </Sheet>
  );
}
