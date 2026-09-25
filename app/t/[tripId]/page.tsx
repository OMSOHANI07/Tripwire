import { PreferenceForm } from "@/components/PreferenceForm";

export default async function TripFormPage({ params }: PageProps<"/t/[tripId]">) {
  const { tripId } = await params;
  return <PreferenceForm tripId={tripId} />;
}
