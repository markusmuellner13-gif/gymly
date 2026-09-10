import { Bar, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="px-4 pt-safe" aria-busy="true" aria-label="Loading statistics">
      <div className="flex items-center gap-3 pt-4">
        <Bar className="size-10 shrink-0" />
        <Bar className="h-6 w-40" />
      </div>
      <Bar className="mt-4 h-32" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-[68px]" />
        ))}
      </div>
      <div className="mt-3">
        <ListSkeleton rows={2} height="h-40" />
      </div>
    </main>
  );
}
