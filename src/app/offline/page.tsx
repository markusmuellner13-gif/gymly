import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Wordmark } from "@/components/logo";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      <div className="mt-10 grid size-16 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        <WifiOff size={26} />
      </div>
      <h1 className="mt-5 text-[20px] font-bold tracking-tight">You are offline</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Gymly needs a connection to load your plan. Anything you ticked off before the signal
        dropped is already saved.
      </p>
      <a
        href="/plan"
        className="ember-fill ring-focus mt-6 flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-white"
      >
        Try again
      </a>
    </main>
  );
}
