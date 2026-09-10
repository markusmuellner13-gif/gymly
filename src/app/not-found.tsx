import Link from "next/link";
import { Compass } from "lucide-react";
import { Wordmark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      <div className="mt-10 grid size-16 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        <Compass size={26} />
      </div>
      <h1 className="mt-5 text-[20px] font-bold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        That page does not exist, or the training day was deleted.
      </p>
      <Link
        href="/plan"
        className="ember-fill ring-focus mt-6 flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-white"
      >
        Back to my plan
      </Link>
    </main>
  );
}
