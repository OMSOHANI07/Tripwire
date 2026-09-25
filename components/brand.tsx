// Visual building blocks from the travel template: waves, eyebrows, photos.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Soft wavy edge used at the bottom/top of photo sections. */
export function Wave({ className = "", flip = false, fill = "var(--color-mist)" }: { className?: string; flip?: boolean; fill?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 h-12 w-full sm:h-20 ${flip ? "-top-px rotate-180" : "-bottom-px"} ${className}`}
    >
      <path d="M0,64 C180,120 360,120 540,84 C720,48 900,0 1080,24 C1260,48 1350,96 1440,80 L1440,120 L0,120 Z" fill={fill} />
    </svg>
  );
}

/** "—— HOW IT WORKS" label above section headings. */
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-brand-200" : "text-brand-600"}`}>
      <span aria-hidden className={`h-0.5 w-8 rounded ${light ? "bg-brand-200" : "bg-brand-600"}`} />
      {children}
    </p>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Destination photo from public/photos (credits on /credits). */
export function DestPhoto({
  id,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className = "",
  priority = false,
}: {
  id: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-brand-100 ${className}`}>
      <Image src={`/photos/${id}.jpg`} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Group Trip Decider home">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-md shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block whitespace-nowrap font-display text-base font-bold text-ink sm:text-lg">Group Trip Decider</span>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-600 sm:block">Plan · Vote · Go</span>
      </span>
    </Link>
  );
}

export function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M10 1.5a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6Zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z" />
    </svg>
  );
}

/** Slim scenic band with a wavy edge above the app pages, then the content column. */
export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="relative h-24 bg-brand-700 sm:h-32">
        <div className="absolute inset-0 bg-[url('/photos/banner.jpg')] bg-cover bg-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/80 via-brand-800/40 to-transparent" />
        <Wave />
      </div>
      <Container className="max-w-3xl pb-14 pt-2">{children}</Container>
    </>
  );
}
