import { Bar, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="px-4 pt-safe" aria-busy="true" aria-label="Loading settings">
      <div className="flex items-center gap-3 pt-4">
        <Bar className="size-10 shrink-0" />
        <Bar className="h-6 w-28" />
      </div>
      <div className="mt-6 flex flex-col gap-6">
        <ListSkeleton rows={3} height="h-[120px]" />
      </div>
    </main>
  );
}
