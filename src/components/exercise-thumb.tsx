"use client";

import { useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { cn } from "@/components/ui";
import { exerciseImageUrl } from "@/lib/exercises";

/**
 * Square photo of a movement for list rows.
 *
 * The catalog's three photo-less kettlebell exercises, anything the user added
 * themselves, and an unreachable CDN all land on the same dumbbell fallback, so
 * a missing frame never leaves a torn hole in the list.
 */
export function ExerciseThumb({
  exerciseId,
  name,
  className,
}: {
  exerciseId: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2",
        className,
      )}
    >
      {failed ? (
        <Dumbbell size={20} className="text-faint" aria-hidden />
      ) : (
        <Image
          src={exerciseImageUrl(exerciseId)}
          alt={`${name} demonstration`}
          fill
          sizes="56px"
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
