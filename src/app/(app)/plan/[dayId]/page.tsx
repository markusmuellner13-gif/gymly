import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings, requireUser } from "@/lib/auth";
import { getDayDetail } from "@/lib/queries";
import { DayScreen } from "@/components/day/day-screen";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/plan/[dayId]">): Promise<Metadata> {
  const { dayId } = await params;
  const user = await requireUser();
  const detail = await getDayDetail(user.id, dayId);
  return { title: detail?.day.name ?? "Day" };
}

export default async function DayPage({ params }: PageProps<"/plan/[dayId]">) {
  const { dayId } = await params;
  const user = await requireUser();
  const [detail, settings] = await Promise.all([
    getDayDetail(user.id, dayId),
    getSettings(user.id),
  ]);
  if (!detail) notFound();

  const otherSession =
    detail.active && !detail.active.isThisDay
      ? { dayName: detail.active.dayName, dayId: detail.active.dayId }
      : null;

  return (
    <DayScreen
      day={{ id: detail.day.id, name: detail.day.name, kind: detail.day.kind }}
      initialRows={detail.exercises}
      initialStartedAt={detail.active?.isThisDay ? detail.active.startedAt : null}
      otherSession={otherSession}
      units={settings.units}
    />
  );
}
