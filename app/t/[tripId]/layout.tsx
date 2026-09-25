import type { Metadata } from "next";

// Trip pages carry private tokens in their URLs: keep them out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TripLayout({ children }: LayoutProps<"/t/[tripId]">) {
  return children;
}
