import { Bar, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="px-4 pt-safe" aria-busy="true" aria-label="Loading day">
      <div className="flex items-center gap-3 pt-4">
        <Bar className="size-10 shrink-0" />
        <Bar className="h-6 w-32" />
      </div>
      <Bar className="mt-4 h-[88px]" />
      <div className="mt-4">
        <ListSkeleton rows={5} height="h-[104px]" />
      </div>
    </main>
  );
}
