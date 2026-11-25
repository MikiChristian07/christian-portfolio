import { Hero } from "@/components/home/hero";
import {
  AboutSection,
  ContactSection,
  ExperienceSection,
  ExpertiseSection,
  ResearchSection,
  WorkSection,
} from "@/components/home/sections";
import { JsonLd, personJsonLd } from "@/components/json-ld";

export default function HomePage() {
  return (
    <>
      <JsonLd data={personJsonLd()} />
      <Hero />
      <WorkSection />
      <AboutSection />
      <ExperienceSection />
      <ExpertiseSection />
      <ResearchSection />
      <ContactSection />
    </>
  );
}
