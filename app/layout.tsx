import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Container, Logo } from "@/components/brand";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Group Trip Decider",
  description: "One link in, one decision out. Collect everyone's trip preferences and pick a destination together.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f78e0" };

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#how", label: "How it works" },
  { href: "/destinations", label: "Destinations" },
  { href: "/trips", label: "My trips" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <Container className="flex items-center justify-between gap-4 py-3">
            <Logo />
            <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-brand-600">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/trips"
              aria-label="My trips"
              title="My trips"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-brand-700 hover:border-brand-300 md:hidden"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M5 2.5A1.5 1.5 0 0 0 3.5 4v14l6.5-3.5 6.5 3.5V4A1.5 1.5 0 0 0 15 2.5H5Z" />
              </svg>
            </Link>
            <Link
              href="/new"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-600 px-3.5 py-2 sm:px-4 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 sm:py-2.5"
            >
              <span className="sm:hidden">Plan a trip</span>
              <span className="hidden sm:inline">Plan your trip</span> <ArrowRight />
            </Link>
            </div>
          </Container>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="bg-ink text-slate-300">
          <Container className="flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-display font-semibold text-white">Group Trip Decider</span> · Scores are plain maths. AI only
              writes the explanations.
            </p>
            <nav aria-label="Footer" className="flex gap-5">
              <Link href="/trips" className="hover:text-white">My trips</Link>
              <Link href="/destinations" className="hover:text-white">Destinations</Link>
              <Link href="/credits" className="hover:text-white">Photo credits</Link>
            </nav>
          </Container>
        </footer>
      </body>
    </html>
  );
}
