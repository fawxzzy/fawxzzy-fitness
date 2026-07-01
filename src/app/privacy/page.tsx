import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { PRIVACY_POLICY_LAST_UPDATED } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Privacy Policy | FawxzzyFitness",
  description: "How Fitness handles accounts, workout data, analytics events, and billing-related information.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-primary)/0.98)]">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
    >
      <Section title="Overview">
        <p>
          Fitness collects only the information needed to run workout tracking, account access, progression guidance,
          and paid Pro features. This page explains what we collect, why we collect it, and how we use it.
        </p>
      </Section>

      <Section title="What We Collect">
        <p>
          We may collect account details such as your email address, username, authentication identifiers, and
          subscription or entitlement state.
        </p>
        <p>
          We also store workout information you create or generate in the app, including routines, workout plans,
          exercises, sets, targets, session history, notes, and progression-related activity.
        </p>
      </Section>

      <Section title="How We Use Data">
        <p>
          Your data is used to authenticate your account, save workout state, restore your history across devices,
          compute progression suggestions, and keep the product functioning correctly.
        </p>
        <p>
          We may also use bounded product analytics, diagnostics, and event data to improve reliability, investigate
          bugs, and understand whether core flows are working as intended.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Payments for Pro access are processed by Stripe. Fitness does not store full payment card numbers in the app
          database. We may store bounded billing records such as Stripe customer ids, checkout session ids, purchase
          state, and entitlement status so we can confirm access truthfully.
        </p>
      </Section>

      <Section title="Sharing And Disclosure">
        <p>
          We do not sell your workout data. Data may be shared with service providers that help operate the app, such
          as hosting, authentication, database, analytics, and payment infrastructure, but only as needed to provide
          the service.
        </p>
      </Section>

      <Section title="Retention And Deletion">
        <p>
          We keep account and workout data for as long as your account remains active or as needed to preserve history,
          prevent entitlement mistakes, or maintain service integrity. We may retain limited records longer when needed
          for fraud prevention, debugging, compliance, or payment dispute evidence.
        </p>
      </Section>

      <Section title="Your Expectations">
        <p>
          You should expect that workout data, notes, progression state, and purchase state are treated as product
          truth and may be used to restore your experience after logout, login, reinstall, or device changes.
        </p>
      </Section>
    </LegalDocumentLayout>
  );
}
