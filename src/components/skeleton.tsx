export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export function ListSkeleton({ rows = 4, height = "h-[76px]" }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} className={height} />
      ))}
    </div>
  );
}

/** Matches the header + tiles + list rhythm of the tab screens. */
export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main className="px-4 pt-safe" aria-busy="true" aria-label="Loading">
      <div className="pt-5">
        <Bar className="h-4 w-24" />
        <Bar className="mt-2 h-8 w-44" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Bar className="h-[86px]" />
        <Bar className="h-[86px]" />
        <Bar className="h-[86px]" />
      </div>
      <div className="mt-6">
        <Bar className="mb-3 h-4 w-20" />
        <ListSkeleton rows={rows} />
      </div>
    </main>
  );
}
