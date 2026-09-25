import type { Metadata } from "next";
import { AdminView } from "@/components/AdminView";

export const metadata: Metadata = { title: "Organizer · Group Trip Decider", robots: { index: false } };

export default async function AdminPage({ params, searchParams }: PageProps<"/t/[tripId]/admin">) {
  const { tripId } = await params;
  const { key } = await searchParams;
  return <AdminView tripId={tripId} orgKey={typeof key === "string" ? key : null} />;
}
