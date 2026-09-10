import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { LEGAL_UPDATED, OPERATOR, isPlaceholder } from "@/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const unconfigured = isPlaceholder(OPERATOR.name);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-safe">
      <header className="pt-4">
        <Link
          href="/account"
          className="ring-focus -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-muted hover:text-text"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{intro}</p>
        <p className="mt-3 text-[12.5px] text-faint">Last updated: {LEGAL_UPDATED}</p>
      </header>

      {unconfigured ? (
        <div className="mt-5 flex gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            <strong className="text-text">Template notice.</strong> The operator details below
            are placeholders. Set <code className="text-[11.5px]">NEXT_PUBLIC_OPERATOR_*</code>{" "}
            environment variables and have this document reviewed by a qualified lawyer before
            offering the service to the public.
          </p>
        </div>
      ) : null}

      <div className="legal mt-7 flex flex-col gap-6">{children}</div>

      <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-[12.5px] text-faint">
        <Link href="/legal/terms" className="hover:text-muted">Terms of Service</Link>
        <Link href="/legal/privacy" className="hover:text-muted">Privacy Policy</Link>
        <Link href="/legal/cookies" className="hover:text-muted">Cookie Policy</Link>
      </footer>
    </main>
  );
}

export function Article({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold tracking-tight">{heading}</h2>
      <div className="mt-2 flex flex-col gap-3 text-[14.5px] leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
