import { ResultsPage } from "@/components/Results";

export default async function Results({ params, searchParams }: PageProps<"/t/[tripId]/results">) {
  const { tripId } = await params;
  const { token } = await searchParams;
  return <ResultsPage tripId={tripId} token={typeof token === "string" ? token : null} />;
}
