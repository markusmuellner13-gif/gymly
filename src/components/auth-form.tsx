"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { signInAction, signUpAction, type AuthState } from "@/lib/actions/auth";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, formAction] = useActionState<AuthState, FormData>(
    isSignUp ? signUpAction : signInAction,
    {},
  );
  const [visible, setVisible] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <Link href="/welcome" className="inline-flex">
          <Wordmark />
        </Link>
        <h1 className="mt-7 text-[26px] font-bold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          {isSignUp
            ? "Your plan and history sync to every device you sign in on."
            : "Sign in to pick up your plan where you left off."}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-dim px-3.5 py-3 text-[13px] leading-relaxed text-danger"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {isSignUp ? (
          <Field label="Name" hint="optional">
            <Input name="name" autoComplete="given-name" placeholder="Marco" maxLength={60} />
          </Field>
        ) : null}

        <Field label="Email">
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            enterKeyHint="next"
          />
        </Field>

        <Field label="Password" hint={isSignUp ? "at least 8 characters" : undefined}>
          <div className="relative">
            <Input
              name="password"
              type={visible ? "text" : "password"}
              required
              minLength={isSignUp ? 8 : undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
              className="pr-11"
              enterKeyHint="go"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-faint hover:text-text"
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        {isSignUp ? (
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted">
            <input
              type="checkbox"
              name="terms"
              className="mt-0.5 size-4 shrink-0 accent-[color:var(--accent)]"
            />
            <span>
              I accept the{" "}
              <Link href="/legal/terms" className="font-medium text-text underline">
                Terms of Service
              </Link>{" "}
              and the{" "}
              <Link href="/legal/privacy" className="font-medium text-text underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        ) : null}

        <SubmitButton label={isSignUp ? "Create account" : "Sign in"} />
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        {isSignUp ? "Already training with Gymly?" : "New here?"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-accent hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block loading={pending} className="mt-1">
      {label}
    </Button>
  );
}
