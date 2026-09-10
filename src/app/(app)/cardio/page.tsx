import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPlanOverview } from "@/lib/queries";
import { CardioBrowser } from "@/components/cardio/cardio-browser";

export const metadata: Metadata = { title: "Cardio & stretching" };
export const dynamic = "force-dynamic";

export default async function CardioPage() {
  const user = await requireUser();
  const days = await getPlanOverview(user.id);
  return (
    <CardioBrowser days={days.map((d) => ({ id: d.id, name: d.name, kind: d.kind }))} />
  );
}
