import type { Metadata } from "next";
import { PageFrame } from "@/components/brand";
import { MyTrips } from "@/components/MyTrips";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My trips · Group Trip Decider", robots: { index: false } };

export default function MyTripsPage() {
  return (
    <PageFrame>
      <PageTitle sub="Every trip you created, joined or opened on this device, with your organizer and personal links saved.">
        My trips
      </PageTitle>
      <MyTrips showEmpty heading={false} twoColumns />
    </PageFrame>
  );
}
