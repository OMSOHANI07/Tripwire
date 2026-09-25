import { PreferenceForm } from "@/components/PreferenceForm";
import { Notice } from "@/components/ui";

export default async function MyAnswersPage({ params, searchParams }: PageProps<"/t/[tripId]/me">) {
  const { tripId } = await params;
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return <Notice tone="error" title="This link is missing its personal token">Open the full personal link you saved after submitting.</Notice>;
  }
  return <PreferenceForm tripId={tripId} token={token} />;
}
