"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Records one case-study view per visit to the page. Renders nothing. */
export function TrackCaseStudyView({ slug }: { slug: string }) {
  useEffect(() => track("case_study_view", { slug }), [slug]);
  return null;
}
