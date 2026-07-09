import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { FITNESS_PRIVATE_SUPPORT_PATH_LABEL, TERMS_OF_SERVICE_LAST_UPDATED } from "@/lib/legal-documents";

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

function BulletList({
  items,
}: {
  items: string[];
}) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => (
        <li key={item} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

function resolveReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && candidate.startsWith("/") ? candidate : undefined;
}

export default function TermsOfServicePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const returnTo = resolveReturnTo(searchParams?.returnTo);

  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_OF_SERVICE_LAST_UPDATED}
      returnTo={returnTo}
    >
      <Section title="Using Fitness">
        <p>
          Fawxzzy Fitness (&quot;Fitness,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a workout tracking and
          progression product operated by Zachariah John Harold Redfield. By accessing or using Fitness,
          you agree to these Terms.
        </p>
        <p>
          You may use Fitness only in lawful ways and only in accordance with these Terms.
        </p>
      </Section>

      <Section title="Eligibility">
        <p>Fitness is not directed to children under 13. You may not use Fitness if you are under 13.</p>
        <p>
          If you are under the age of majority where you live, you should use Fitness only with permission and
          supervision from a parent or guardian.
        </p>
        <p>
          Paid Pro subscriptions are intended only for users who are at least 18 years old or the age of
          majority where they live.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          You are responsible for keeping your account credentials secure and for the activity that occurs through your
          account.
        </p>
        <p>
          You may not share your login with other people, sell or transfer your account, impersonate another person,
          or attempt to access accounts that are not yours.
        </p>
      </Section>

      <Section title="Workout Data and Progression">
        <p>
          Fitness stores routines, workout plans, exercises, targets, notes, session history, completion state, and
          progression-related activity so your training state can persist across sessions and devices.
        </p>
        <p>
          Progression suggestions, workout receipts, targets, and related guidance are informational tools. They are
          not medical advice, diagnosis, treatment, physical therapy, or a guarantee of training results.
        </p>
        <p>
          You are responsible for your own training decisions, exercise form, load management, rest, recovery, and
          safety.
        </p>
      </Section>

      <Section title="Health and Training Disclaimer">
        <p>
          Fitness is not a medical provider, healthcare service, emergency service, or individualized coaching service.
        </p>
        <p>
          Fitness may provide automated workout tracking, targets, and progression guidance based on information in
          your account. This guidance is informational and does not create a medical, clinical, physical-therapy, or
          personal-trainer relationship.
        </p>
        <p>
          Do not use Fitness as a substitute for professional medical advice, diagnosis, treatment, physical therapy,
          or personal training from a qualified professional.
        </p>
        <p>
          Consult a qualified healthcare professional before beginning or changing an exercise program, especially if
          you have a medical condition, injury, pain, pregnancy-related concern, disability, heart condition, or other
          health concern.
        </p>
        <p>
          Stop exercising and seek appropriate help if you experience chest pain, fainting, severe dizziness, unusual
          shortness of breath, severe pain, or other concerning symptoms.
        </p>
        <p>
          Fitness is not for emergencies. If you may be experiencing a medical emergency, contact emergency services
          or a qualified medical professional.
        </p>
      </Section>

      <Section title="Pro Purchases and Subscriptions">
        <p>
          Fitness may offer paid Pro features. Pro purchases and subscriptions are processed through Stripe-hosted
          checkout or other Stripe-hosted billing surfaces.
        </p>
        <p>
          The price, billing interval, renewal terms, taxes, and available payment methods should be shown at checkout
          or in the applicable billing surface before purchase.
        </p>
        <p>
          Pro is a monthly recurring subscription unless stated otherwise at checkout. Your subscription renews
          automatically until cancelled.
        </p>
        <p>
          If you purchase a recurring subscription, it may renew automatically until cancelled. To avoid future
          charges, cancel before the renewal date through the available billing management flow. If self-service
          billing is unavailable or fails, contact support before the renewal date.
        </p>
        <p>
          Cancellation normally stops future renewals and preserves Pro access through the current paid period,
          unless the subscription is refunded, disputed, charged back, cannot be verified, or otherwise becomes
          invalid.
        </p>
        <p>
          {FITNESS_PRIVATE_SUPPORT_PATH_LABEL}
        </p>
        <p>
          Pro entitlement is granted only after payment or subscription state is successfully verified. Fitness may
          withhold, delay, suspend, or revoke Pro access if payment fails, is cancelled, is refunded, is disputed, is
          charged back, cannot be verified, or appears fraudulent.
        </p>
        <p>
          Deleting the app or requesting account deletion does not automatically cancel a subscription unless the
          billing cancellation is completed through the applicable billing flow or confirmed by support. If an account
          deletion request is made while a Stripe subscription is active, the subscription must be cancelled through
          the Stripe billing flow or cancelled with support before destructive account deletion is completed.
        </p>
        <p>
          Refund requests are reviewed case by case and, when approved, are processed through Stripe where possible.
          Duplicate payments, accidental immediate purchases, and support-approved exceptions may be reviewed for
          refund. Except where required by law or expressly stated at checkout, partial-month refunds are not
          guaranteed after Pro access has been granted.
        </p>
      </Section>

      <Section title="Entitlement Accuracy">
        <p>
          Fitness stores purchase state, subscription state, entitlement state, and related billing identifiers so the
          app can grant, restore, or revoke access accurately.
        </p>
        <p>
          If the app shows the wrong entitlement state, contact support. Fitness may correct entitlement state based
          on Stripe records, account records, webhook records, or other reliable billing evidence.
        </p>
      </Section>

      <Section title="Acceptable Use">
        <p>You may not use Fitness to:</p>
        <BulletList
          items={[
            "break the law",
            "interfere with the service or other users",
            "abuse, overload, scan, attack, or disrupt infrastructure",
            "reverse engineer restricted systems except where legally permitted",
            "scrape protected user data",
            "automate harmful traffic",
            "exploit payment, entitlement, authentication, or authorization flows",
            "bypass Pro access controls",
            "upload malicious code",
            "attempt unauthorized access to systems, accounts, or data",
            "use the service to harass, threaten, or harm others",
          ]}
        />
      </Section>

      <Section title="User Content">
        <p>
          You keep ownership of workout notes, routines, plans, and other content you create in Fitness.
        </p>
        <p>
          By using Fitness, you give us permission to host, store, process, display, back up, transmit, and use your
          content as needed to operate the app, provide account features, restore workout history, generate progression
          guidance, provide support, and maintain service integrity.
        </p>
        <p>
          You are responsible for the content you add to Fitness. Do not upload content that is unlawful, harmful,
          invasive of another person&apos;s privacy, or that you do not have the right to use.
        </p>
      </Section>

      <Section title="Product Ownership and Feedback">
        <p>
          Fitness, including its software, design, interface, branding, systems, and documentation, is owned by
          Zachariah John Harold Redfield or its licensors.
        </p>
        <p>
          You may submit ideas, bug reports, suggestions, or feedback. We may use feedback without restriction or
          compensation to improve the product.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          Fitness may rely on third-party services such as hosting, authentication, database, analytics, diagnostics,
          payment, billing, security, and support providers.
        </p>
        <p>
          Stripe processes Pro payments and billing-related flows. Discord may be used for community or support
          communication. Third-party services may have their own terms, privacy policies, and security practices.
        </p>
      </Section>

      <Section title="Availability and Changes">
        <p>
          Fitness may change, pause, limit, or remove features at any time. We aim for stable account and workout
          state, but uninterrupted availability is not guaranteed.
        </p>
        <p>
          We may update the app, modify Pro features, fix bugs, change progression logic, update install guidance, or
          adjust product behavior as the service evolves.
        </p>
      </Section>

      <Section title="Suspension and Termination">
        <p>
          We may suspend or terminate access to Fitness if we reasonably believe that you violated these Terms, created
          security risk, abused the service, misused payment or entitlement flows, or used the app in a way that may
          harm Fitness, users, infrastructure, or service providers.
        </p>
        <p>
          You may stop using Fitness at any time. Some records may remain as described in the Privacy Policy.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          Fitness is provided on an as-is and as-available basis to the fullest extent allowed by applicable law.
        </p>
        <p>
          We do not guarantee that Fitness will be uninterrupted, error-free, secure, medically appropriate, suitable
          for every training context, or capable of producing any specific fitness result.
        </p>
        <p>
          To the fullest extent allowed by applicable law, Fitness and its operator will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits,
          lost data, lost workout history, training injury, service interruption, payment processing issues,
          or unauthorized account access.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations of liability, so some limits may not apply to you.
        </p>
      </Section>

    </LegalDocumentLayout>
  );
}
