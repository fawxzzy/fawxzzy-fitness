import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { TERMS_OF_SERVICE_LAST_UPDATED } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Terms of Service | FawxzzyFitness",
  description: "The basic service terms for account use, workout logging, and paid Pro access in Fitness.",
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

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_OF_SERVICE_LAST_UPDATED}
    >
      <Section title="Using Fitness">
        <p>
          Fitness is provided as a workout tracking and progression product. By using the app, you agree to use it only
          in lawful ways and not to interfere with the service, other users, or the platform infrastructure.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          You are responsible for keeping your account credentials secure and for the activity that occurs through your
          account. You should not share your login with other people or attempt to access accounts that are not yours.
        </p>
      </Section>

      <Section title="Workout Data And Progression">
        <p>
          Fitness stores routines, workout plans, exercise targets, notes, and session history so your training state
          can persist. Progression suggestions and receipts are guidance tools, not medical or coaching guarantees.
        </p>
      </Section>

      <Section title="Pro Purchases">
        <p>
          Pro purchases and subscriptions are processed through Stripe-hosted checkout. Purchase state, entitlement
          state, subscription state, and related billing identifiers may be stored so the app can grant or restore
          access accurately.
        </p>
        <p>
          If a payment fails, is cancelled, or cannot be verified, Fitness may withhold or delay Pro access until the
          billing state is confirmed.
        </p>
      </Section>

      <Section title="Acceptable Use">
        <p>
          You may not use the service to abuse infrastructure, reverse engineer restricted systems, automate harmful
          traffic, scrape protected user data, or exploit payment, entitlement, or authentication flows.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          Fitness may change, pause, or remove features at any time. We aim for stable state truth, but uninterrupted
          availability is not guaranteed.
        </p>
      </Section>

      <Section title="Limitation Of Liability">
        <p>
          Fitness is provided on an as-is and as-available basis to the fullest extent allowed by applicable law. We do
          not guarantee that the app will always be error-free, uninterrupted, or suitable for every training context.
        </p>
      </Section>

      <Section title="Health And Training Disclaimer">
        <p>
          Fitness is not medical advice, diagnosis, treatment, or individualized coaching. You are responsible for your
          own training decisions, safety, and load management.
        </p>
      </Section>
    </LegalDocumentLayout>
  );
}
