"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/* --------------------------------- Button --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "done";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "ember-fill text-white active:brightness-95",
  secondary:
    "bg-surface-2 text-text border border-line hover:bg-surface-3 active:bg-surface-3",
  ghost: "text-muted hover:text-text hover:bg-surface-2 active:bg-surface-2",
  danger: "bg-danger-dim text-danger border border-line hover:brightness-110",
  done: "bg-done text-black active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-13 px-5 text-base rounded-2xl gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    block,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "no-select ring-focus inline-flex items-center justify-center font-semibold transition duration-150",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
});

/* ------------------------------- Icon button ------------------------------- */

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    tone?: "default" | "danger";
  }
>(function IconButton({ label, tone = "default", className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "no-select ring-focus grid size-10 shrink-0 place-items-center rounded-xl transition active:scale-95",
        tone === "danger"
          ? "text-danger hover:bg-danger-dim"
          : "text-muted hover:bg-surface-2 hover:text-text",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/* --------------------------------- Input ----------------------------------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "ring-focus h-12 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[15px] text-text",
          "outline-none transition placeholder:text-faint",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {hint ? <span className="text-[12px] text-faint">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-[13px] text-danger">{error}</span> : null}
    </label>
  );
}

/* ----------------------------- Segmented control ---------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("no-select flex gap-1 rounded-xl border border-line bg-surface-2 p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "ring-focus flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition",
            value === o.value ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Toggle ---------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "ring-focus relative h-[30px] w-[52px] shrink-0 rounded-full transition disabled:opacity-40",
        checked ? "ember-fill" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-6 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-[25px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

/* -------------------------------- Empty state -------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ----------------------------------- Chip ------------------------------------ */

export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active && color
          ? { background: color, borderColor: color, color: "#0b0c0f" }
          : undefined
      }
      className={cn(
        "no-select ring-focus shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition active:scale-95",
        active && !color
          ? "border-transparent bg-text font-semibold text-base"
          : active
            ? "border-transparent font-semibold"
            : "border-line bg-surface-2 text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

/* ----------------------------------- Sheet ----------------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  full,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Tall sheets (the exercise picker) take almost the whole screen. */
  full?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-sheet relative flex w-full flex-col overflow-hidden border border-line bg-surface shadow-pop",
          "rounded-t-3xl sm:max-w-lg sm:rounded-3xl",
          full ? "h-[88svh] sm:h-[80svh]" : "max-h-[88svh]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <span aria-hidden className="absolute inset-x-0 top-1.5 mx-auto h-1 w-9 rounded-full bg-surface-3 sm:hidden" />
          <h2 className="truncate pt-1 text-[16px] font-semibold sm:pt-0">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseGlyph />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe">{children}</div>
      </div>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------------- Confirm ----------------------------------- */

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  danger = true,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="p-4">
        <p className="text-[14px] leading-relaxed text-muted">{body}</p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            block
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
