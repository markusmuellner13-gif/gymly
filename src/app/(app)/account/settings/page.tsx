import type { Metadata } from "next";
import { getSettings, requireUser } from "@/lib/auth";
import { DELETION_GRACE_DAYS } from "@/lib/account-lifecycle";
import { SettingsScreen } from "@/components/account/settings-screen";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  return (
    <SettingsScreen
      profile={{ name: user.name, email: user.email, createdAt: user.createdAt }}
      settings={{
        units: settings.units,
        timezone: settings.timezone,
        remindersEnabled: settings.remindersEnabled,
        reminderTime: settings.reminderTime,
        reminderDays: settings.reminderDays ?? [],
        streakRemindersEnabled: settings.streakRemindersEnabled,
        analyticsConsent: settings.analyticsConsent,
      }}
      vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      graceDays={DELETION_GRACE_DAYS}
    />
  );
}
