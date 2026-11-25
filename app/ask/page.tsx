import type { Metadata } from "next";
import { AskExperience } from "@/components/twin/ask-experience";

export const metadata: Metadata = {
  title: "Ask the twin",
  description: "Talk to Christian Onovo's digital twin about his work, experience and projects.",
  alternates: { canonical: "/ask" },
};

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const { q } = await searchParams;
  const question = typeof q === "string" ? q.trim().slice(0, 1000) : "";
  return <AskExperience initialQuestion={question} />;
}
