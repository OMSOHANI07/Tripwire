import type { Metadata } from "next";
import { connection } from "next/server";
import { NewTripForm } from "@/components/NewTripForm";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Plan a trip · Group Trip Decider" };

export default async function NewTripPage() {
  await connection(); // default dates are relative to today
  return (
    <>
      <PageTitle sub="Set this up once. You'll get one link to drop in the group chat.">Plan a trip</PageTitle>
      <NewTripForm />
    </>
  );
}
