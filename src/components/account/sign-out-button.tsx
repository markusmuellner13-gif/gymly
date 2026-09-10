"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      block
      loading={pending}
      onClick={() => start(() => void signOutAction())}
    >
      <LogOut size={17} /> Sign out
    </Button>
  );
}
