// Small shared UI building blocks (server-safe: no hooks).
import type { ReactNode } from "react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-5 py-2.5 font-semibold text-brand-700 hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50",
  small:
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50",
};

export const input =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(11,37,69,0.18)] sm:p-6 ${className}`}>{children}</section>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{children}</h1>
      {sub && <p className="mt-2 text-slate-600">{sub}</p>}
    </div>
  );
}

type Tone = "info" | "warn" | "error" | "success";
const TONES: Record<Tone, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export function Notice({ tone = "info", children, title }: { tone?: Tone; children?: ReactNode; title?: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${TONES[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-slate-600">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-medium text-slate-900">
        {label}
      </label>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}
