import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkout } from "@/lib/queries";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorker } from "@/components/service-worker";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const active = await getActiveWorkout(user.id);

  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 pad-nav">{children}</div>
      <BottomNav liveSession={Boolean(active)} />
      <ServiceWorker />
    </>
  );
}
