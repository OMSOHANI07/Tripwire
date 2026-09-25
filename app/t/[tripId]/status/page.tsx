import { StatusView } from "@/components/StatusView";

export default async function StatusPage({ params }: PageProps<"/t/[tripId]/status">) {
  const { tripId } = await params;
  return <StatusView tripId={tripId} />;
}
