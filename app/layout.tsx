import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Group Trip Decider",
  description: "One link in, one decision out. Collect everyone's trip preferences and pick a destination together.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">✈</span>
              Group Trip Decider
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <footer className="py-6 text-center text-xs text-stone-500">
          Scores are computed by plain code; AI only writes the explanations.
        </footer>
      </body>
    </html>
  );
}
