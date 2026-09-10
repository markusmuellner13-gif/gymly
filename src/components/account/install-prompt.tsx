"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Offers "add to home screen". Chrome-family browsers fire a prompt event we
 * can trigger directly; iOS Safari has no such API, so it gets instructions.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari reports installation on navigator instead of the media query.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(installed);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;
  if (!deferred && !isIos) return null;

  return (
    <section className="card mt-7 p-4">
      <h2 className="text-[15px] font-semibold">Install Gymly</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        {isIos && !deferred
          ? "Tap the Share button in Safari, then “Add to Home Screen” to use Gymly full screen."
          : "Add Gymly to your home screen for a full-screen, app-like session."}
      </p>
      {deferred ? (
        <Button
          className="mt-3"
          block
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          <Download size={17} /> Add to home screen
        </Button>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-accent">
          <Share size={16} /> Share → Add to Home Screen
        </p>
      )}
    </section>
  );
}
