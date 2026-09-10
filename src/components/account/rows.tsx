import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wider text-faint">
        {title}
      </h2>
      <div className="card divide-y divide-[color:var(--line)] overflow-hidden">{children}</div>
      {note ? <p className="mt-2 px-1 text-[12px] leading-relaxed text-faint">{note}</p> : null}
    </section>
  );
}

export function LinkRow({
  href,
  icon,
  label,
  value,
  danger,
  external,
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  external?: boolean;
}) {
  const content = (
    <>
      {icon ? (
        <span className={danger ? "shrink-0 text-danger" : "shrink-0 text-muted"}>{icon}</span>
      ) : null}
      <span className={`min-w-0 flex-1 truncate ${danger ? "text-danger" : ""}`}>{label}</span>
      {value ? <span className="shrink-0 text-[13px] text-faint">{value}</span> : null}
      <ChevronRight size={16} className="shrink-0 text-faint" aria-hidden />
    </>
  );
  const className =
    "ring-focus flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium transition hover:bg-surface-2";

  return external ? (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function StaticRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium">
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[13px] text-faint">{value}</span>
    </div>
  );
}
