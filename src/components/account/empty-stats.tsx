import Link from "next/link";
import { BarChart3 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        <BarChart3 size={26} />
      </div>
      <h3 className="text-[17px] font-semibold">No sessions yet</h3>
      <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-muted">
        Finish your first workout and your volume, streaks and personal records will show up
        here.
      </p>
      <Link
        href="/plan"
        className="ember-fill ring-focus mt-5 flex h-11 items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-white"
      >
        Go to my plan
      </Link>
    </div>
  );
}
