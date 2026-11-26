import type { Metadata } from "next";
import { person } from "@/content/person";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this site and Miki, Christian Onovo's AI assistant, collect, why, and for how long.",
  alternates: { canonical: "/privacy" },
};

const shell = "mx-auto max-w-[90rem] px-5 md:px-[4.5rem]";
const UPDATED = "26 November 2026";

/**
 * Plain privacy notice in the case-study page language (same shell, display headings,
 * muted body, hairline rules). Required by Google for the OAuth app, and by UK GDPR now
 * that Miki takes booking requests. Every statement must match what the code does.
 */
export default function PrivacyPage() {
  return (
    <article className={`${shell} pt-16 pb-24 md:pt-24`}>
      <header className="max-w-[60ch] md:ml-[calc(100%/12*2)]">
        <h1 className="font-display text-4xl md:text-5xl">Privacy</h1>
        <p className="mt-6 text-xl text-ink-muted">
          What this site and Miki, my AI assistant, collect, why, and for how long. Written plainly, because that is how I would
          want it explained to me.
        </p>
        <p className="mt-4 text-sm text-ink-muted">Last updated {UPDATED}.</p>
      </header>

      <div className="mt-16 max-w-[66ch] space-y-14 md:ml-[calc(100%/12*2)]">
        <Section title="Who is responsible">
          <p>
            This is {person.name}&apos;s personal website, run from London. I am responsible for your data. Questions or requests:{" "}
            <a href={`mailto:${person.contact.email}`} className="link">
              {person.contact.email}
            </a>
            .
          </p>
        </Section>

        <Section title="Talking to Miki">
          <ul>
            <li>
              Your questions are sent to OpenAI to generate Miki&apos;s answers. OpenAI handles them under its API data policy, which
              does not use them to train its models by default.
            </li>
            <li>
              The conversation is kept only in your browser tab and disappears when you close it. This site does not store it on a
              server.
            </li>
            <li>
              If you give Miki your name, email or a message for me, those details are sent to me privately on Telegram so I can
              reply. Questions Miki cannot answer are sent to me too, without anything that identifies you.
            </li>
          </ul>
        </Section>

        <Section title="Booking a call">
          <ul>
            <li>
              To request a call I ask for your name, email, optional company, the purpose, your preferred time, duration and time
              zone.
            </li>
            <li>
              Your email is verified with a one-time code before the request reaches me. I am notified on Telegram and decide
              whether to accept.
            </li>
            <li>
              If I accept, a Google Calendar invitation with a Google Meet link is sent to you. Emails about your request are sent
              from my Gmail address.
            </li>
            <li>Booking requests are kept for 90 days after the meeting date, then deleted.</li>
          </ul>
        </Section>

        <Section title="My Google account">
          <p>
            Miki connects only to my own Google account, with permission I granted. It uses my calendar&apos;s free and busy
            times (never the details of my events) to offer slots, creates the events I approve, sends emails I approve, and reads
            replies only in email threads it started. It never reads the rest of my inbox.
          </p>
          <p className="mt-4">
            Miki&apos;s use and transfer of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="link" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section title="Contact form">
          <p>Messages from the contact form are delivered to my inbox by EmailJS and are not stored on this site.</p>
        </Section>

        <Section title="Analytics">
          <ul>
            <li>
              I use PostHog, hosted in the EU, in cookieless mode: no cookies or browser storage are used for analytics, and IP
              addresses are not kept.
            </li>
            <li>
              I count page views, which projects are viewed, and how Miki is used (for example how long answers take). The content
              of your conversations is never sent to analytics.
            </li>
            <li>Your browser&apos;s Do Not Track setting is respected.</li>
          </ul>
        </Section>

        <Section title="Keeping the site safe">
          <p>
            To stop abuse, your IP address is used briefly to apply rate limits and is discarded within minutes. This site sets no
            cookies.
          </p>
        </Section>

        <Section title="Services involved">
          <p>
            Vercel (hosting), Upstash (temporary data and rate limits), OpenAI (Miki&apos;s answers), Google (calendar, Meet and
            email), Telegram (notifications to me), EmailJS (contact form) and PostHog (analytics). Each processes data only to
            provide its part of the service.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under UK data protection law you can ask what I hold about you, ask me to correct or delete it, or object to how it is
            used. Email{" "}
            <a href={`mailto:${person.contact.email}`} className="link">
              {person.contact.email}
            </a>{" "}
            and I will reply within a month. You can also complain to the Information Commissioner&apos;s Office (ico.org.uk).
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 text-lg text-ink-muted [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-accent">{children}</div>
    </section>
  );
}
