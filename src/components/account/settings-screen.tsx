"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Download,
  Globe,
  KeyRound,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Button,
  Field,
  Input,
  Segmented,
  Sheet,
  Toggle,
  cn,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { Section, StaticRow } from "@/components/account/rows";
import { THEME_STORAGE_KEY, type ThemePref } from "@/lib/theme";
import {
  changePasswordAction,
  deleteAccountNowAction,
  exportDataAction,
  requestDeletionAction,
  updateProfileAction,
  updateSettingsAction,
} from "@/lib/actions/account";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "@/lib/actions/push";

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

export function SettingsScreen({
  profile,
  settings,
  vapidPublicKey,
  graceDays,
}: {
  profile: { name: string | null; email: string; createdAt: number };
  settings: {
    units: "kg" | "lb";
    timezone: string;
    remindersEnabled: boolean;
    reminderTime: string;
    reminderDays: number[];
    streakRemindersEnabled: boolean;
    analyticsConsent: boolean;
  };
  vapidPublicKey: string | null;
  graceDays: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(profile.name ?? "");
  const [units, setUnits] = useState(settings.units);
  const [theme, setTheme] = useState<ThemePref>("system");
  const [timezone, setTimezone] = useState(settings.timezone);

  const [pushOn, setPushOn] = useState(settings.remindersEnabled);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime);
  const [reminderDays, setReminderDays] = useState<number[]>(settings.reminderDays ?? []);
  const [streaks, setStreaks] = useState(settings.streakRemindersEnabled);
  const [analytics, setAnalytics] = useState(settings.analyticsConsent);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    try {
      setTheme((localStorage.getItem(THEME_STORAGE_KEY) as ThemePref) || "system");
    } catch {
      setTheme("system");
    }
    setPushSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  const save = (patch: Parameters<typeof updateSettingsAction>[0], message?: string) =>
    startTransition(async () => {
      const res = await updateSettingsAction(patch);
      if (!res.ok) return toast(res.error, "error");
      if (message) toast(message, "success");
      router.refresh();
    });

  const applyTheme = (pref: ThemePref) => {
    setTheme(pref);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Private mode: the choice just will not persist across sessions.
    }
    const dark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  };

  /* ----------------------------- Notifications ----------------------------- */

  const enablePush = async () => {
    if (!vapidPublicKey) {
      toast("Push is not configured on this deployment.", "error");
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast(
          permission === "denied"
            ? "Notifications are blocked in your browser settings."
            : "Notification permission was dismissed.",
          "error",
        );
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON();
      const res = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!res.ok) return toast(res.error, "error");
      setPushOn(true);
      toast("Reminders are on for this device.", "success");
      router.refresh();
    } catch {
      toast("Could not enable notifications on this device.", "error");
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushOn(false);
      await updateSettingsAction({ remindersEnabled: false });
      toast("Reminders turned off.", "info");
      router.refresh();
    } catch {
      toast("Could not turn reminders off.", "error");
    } finally {
      setPushBusy(false);
    }
  };

  const toggleDay = (day: number) => {
    const next = reminderDays.includes(day)
      ? reminderDays.filter((d) => d !== day)
      : [...reminderDays, day].sort();
    setReminderDays(next);
    save({ reminderDays: next });
  };

  /* -------------------------------- Export --------------------------------- */

  const exportData = () =>
    startTransition(async () => {
      const res = await exportDataAction();
      if (!res.ok) return toast(res.error, "error");
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gymly-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Your data has been downloaded.", "success");
    });

  return (
    <main className="px-4 pt-safe">
      <header className="flex items-center gap-1 pt-3">
        <Link
          href="/account"
          aria-label="Back to account"
          className="ring-focus grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="px-1 text-[19px] font-bold tracking-tight">Settings</h1>
      </header>

      {/* Profile */}
      <Section title="Profile">
        <div className="px-4 py-3.5">
          <Field label="Display name">
            <Input
              value={name}
              maxLength={60}
              placeholder="Your name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if ((profile.name ?? "") === name.trim()) return;
                startTransition(async () => {
                  await updateProfileAction(name);
                  toast("Name updated.", "success");
                  router.refresh();
                });
              }}
            />
          </Field>
        </div>
        <StaticRow label="Email" value={profile.email} />
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div className="px-4 py-3.5">
          <p className="mb-2 text-[13px] font-medium text-muted">Weight units</p>
          <Segmented
            value={units}
            onChange={(v) => {
              setUnits(v);
              save({ units: v }, `Switched to ${v === "kg" ? "kilograms" : "pounds"}.`);
            }}
            options={[
              { value: "kg", label: "Kilograms" },
              { value: "lb", label: "Pounds" },
            ]}
          />
        </div>
        <div className="px-4 py-3.5">
          <p className="mb-2 text-[13px] font-medium text-muted">Appearance</p>
          <Segmented
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Globe size={18} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Time zone</span>
            <span className="block truncate text-[12.5px] text-faint">{timezone}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (!tz || tz === timezone) return toast("Already up to date.", "info");
              setTimezone(tz);
              save({ timezone: tz }, `Time zone set to ${tz}.`);
            }}
          >
            Detect
          </Button>
        </div>
      </Section>

      {/* Notifications */}
      <section id="notifications" className="scroll-mt-4">
        <Section title="Push notifications">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="shrink-0 text-muted">
              {pushOn ? <Bell size={18} /> : <BellOff size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Training reminders</span>
              <span className="block text-[12.5px] leading-snug text-faint">
                {!pushSupported
                  ? "Not supported in this browser"
                  : !vapidPublicKey
                    ? "Not configured on this deployment"
                    : pushOn
                      ? "On for this device"
                      : "Get a nudge on the days you train"}
              </span>
            </span>
            <Toggle
              label="Training reminders"
              checked={pushOn}
              disabled={pushBusy || !pushSupported || !vapidPublicKey}
              onChange={(v) => (v ? enablePush() : disablePush())}
            />
          </div>

          {pushOn ? (
            <>
              <div className="px-4 py-3.5">
                <p className="mb-2 text-[13px] font-medium text-muted">Remind me at</p>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  onBlur={() => save({ reminderTime }, "Reminder time saved.")}
                  className="w-40"
                />
              </div>
              <div className="px-4 py-3.5">
                <p className="mb-2 text-[13px] font-medium text-muted">On these days</p>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((d, i) => {
                    const on = reminderDays.includes(d.value);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        aria-pressed={on}
                        aria-label={`Toggle reminders on day ${i + 1}`}
                        className={cn(
                          "ring-focus size-10 rounded-xl text-[13px] font-bold transition active:scale-90",
                          on
                            ? "ember-fill text-white"
                            : "border border-line bg-surface-2 text-faint",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">Streak alerts</span>
                  <span className="block text-[12.5px] text-faint">
                    Warn me when a streak is about to break
                  </span>
                </span>
                <Toggle
                  label="Streak alerts"
                  checked={streaks}
                  onChange={(v) => {
                    setStreaks(v);
                    save({ streakRemindersEnabled: v });
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const res = await sendTestNotificationAction();
                    toast(
                      res.ok ? "Test notification sent." : res.error,
                      res.ok ? "success" : "error",
                    );
                  })
                }
                className="ring-focus flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium hover:bg-surface-2"
              >
                <Send size={18} className="text-muted" />
                Send a test notification
              </button>
            </>
          ) : null}
        </Section>
      </section>

      {/* Privacy */}
      <Section
        title="Privacy"
        note="Gymly stores no advertising cookies and never sells your data. See the Privacy Policy for the full detail."
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Anonymous usage analytics</span>
            <span className="block text-[12.5px] leading-snug text-faint">
              Optional. Off by default, and never used for advertising.
            </span>
          </span>
          <Toggle
            label="Anonymous usage analytics"
            checked={analytics}
            onChange={(v) => {
              setAnalytics(v);
              save({ analyticsConsent: v });
            }}
          />
        </div>
      </Section>

      {/* Data & security */}
      <Section title="Your data">
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="ring-focus flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium hover:bg-surface-2"
        >
          <KeyRound size={18} className="text-muted" />
          Change password
        </button>
        <button
          type="button"
          onClick={exportData}
          className="ring-focus flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium hover:bg-surface-2"
        >
          <Download size={18} className="text-muted" />
          <span className="min-w-0 flex-1">
            Export my data
            <span className="block text-[12.5px] font-normal text-faint">
              Everything we hold, as JSON (GDPR Art. 20)
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="ring-focus flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-danger hover:bg-danger-dim"
        >
          <Trash2 size={18} />
          Delete my account
        </button>
      </Section>

      <p className="mb-2 mt-6 text-center text-[12px] text-faint">
        Member since {new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </p>

      <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <DeleteAccountSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        graceDays={graceDays}
      />
    </main>
  );
}

/* ------------------------------- Sub-sheets -------------------------------- */

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Change password">
      <div className="flex flex-col gap-4 p-4">
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="New password" hint="at least 8 characters">
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <p className="-mt-1 text-[12.5px] leading-relaxed text-faint">
          Changing your password signs you out on every device, including this one.
        </p>
        <Button
          block
          loading={busy}
          disabled={!current || next.length < 8}
          onClick={async () => {
            setBusy(true);
            const res = await changePasswordAction(current, next);
            setBusy(false);
            if (!res.ok) return toast(res.error, "error");
            toast("Password changed. Please sign in again.", "success");
            router.push("/sign-in");
          }}
        >
          Change password
        </Button>
      </div>
    </Sheet>
  );
}

function DeleteAccountSheet({
  open,
  onClose,
  graceDays,
}: {
  open: boolean;
  onClose: () => void;
  graceDays: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [immediate, setImmediate] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Delete account">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-2.5 rounded-xl bg-danger-dim px-3.5 py-3">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-[13px] leading-relaxed text-danger">
            This removes your plan, your sessions and every statistic tied to this account.
          </p>
        </div>

        <p className="text-[13.5px] leading-relaxed text-muted">
          By default your account is scheduled for erasure and stops working straight away.
          Signing in again within <strong className="text-text">{graceDays} days</strong>{" "}
          cancels it. After that it is deleted permanently.
        </p>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed">
          <input
            type="checkbox"
            checked={immediate}
            onChange={(e) => setImmediate(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[color:var(--danger)]"
          />
          <span>
            Delete immediately and permanently instead.
            <span className="block text-faint">This cannot be undone.</span>
          </span>
        </label>

        <Field label="Confirm with your password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button
          variant="danger"
          block
          loading={busy}
          disabled={!password}
          onClick={async () => {
            setBusy(true);
            const res = immediate
              ? await deleteAccountNowAction(password)
              : await requestDeletionAction(password);
            setBusy(false);
            if (res && !res.ok) return toast(res.error, "error");
            toast(
              immediate ? "Your account has been deleted." : "Account scheduled for deletion.",
              "info",
            );
            router.push("/welcome");
          }}
        >
          {immediate ? "Delete permanently" : `Delete in ${graceDays} days`}
        </Button>
      </div>
    </Sheet>
  );
}

/** VAPID keys arrive base64url encoded; PushManager needs raw bytes. */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
