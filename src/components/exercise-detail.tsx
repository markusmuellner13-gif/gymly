"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Sheet, cn } from "@/components/ui";
import { MuscleMap } from "@/components/muscle-map";
import { titleCase, type Exercise } from "@/lib/exercises";
import { getExerciseDetailAction } from "@/lib/actions/catalog";

const cache = new Map<string, Exercise | null>();

export function ExerciseDetailSheet({
  exerciseId,
  fallbackName,
  onClose,
  footer,
}: {
  exerciseId: string | null;
  fallbackName?: string;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const [data, setData] = useState<Exercise | null | undefined>(
    exerciseId ? cache.get(exerciseId) : undefined,
  );

  useEffect(() => {
    if (!exerciseId) return;
    if (cache.has(exerciseId)) {
      setData(cache.get(exerciseId));
      return;
    }
    let cancelled = false;
    setData(undefined);
    getExerciseDetailAction(exerciseId).then((res) => {
      cache.set(exerciseId, res);
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return (
    <Sheet
      open={Boolean(exerciseId)}
      onClose={onClose}
      title={data?.name ?? fallbackName ?? "Exercise"}
    >
      {data === undefined ? (
        <div className="flex justify-center py-16 text-faint">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : data === null ? (
        <div className="px-4 py-10 text-center text-[14px] text-muted">
          No details available for this exercise.
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {data.images.length ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {data.images.map((src, i) => (
                <div
                  key={src}
                  className="relative aspect-4/3 w-[76%] max-w-72 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2"
                >
                  <Image
                    src={src}
                    alt={`${data.name}, position ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 76vw, 288px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <Tag>{titleCase(data.equipment)}</Tag>
            {data.level ? <Tag>{titleCase(data.level)}</Tag> : null}
            {data.mechanic ? <Tag>{titleCase(data.mechanic)}</Tag> : null}
            {data.force ? <Tag>{titleCase(data.force)}</Tag> : null}
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-muted">Muscles worked</h3>
            <div className="mt-2">
              <MuscleMap primary={data.primary} secondary={data.secondary} />
            </div>
          </div>

          {data.instructions.length ? (
            <div>
              <h3 className="text-[13px] font-semibold text-muted">How to do it</h3>
              <ol className="mt-2 flex flex-col gap-2.5">
                {data.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                    <span className="tnum mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-faint">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {footer}
        </div>
      )}
    </Sheet>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted")}>
      {children}
    </span>
  );
}
