import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { FITNESS_PRIVATE_SUPPORT_PATH_LABEL, PRIVACY_POLICY_LAST_UPDATED } from "@/lib/legal-documents";

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

export default function PrivacyPolicyPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const returnTo = resolveReturnTo(searchParams?.returnTo);

  return (
    <LegalDocumentLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
      returnTo={returnTo}
    >
      <Section title="Overview">
        <p>
          Fawxzzy Fitness (&quot;Fitness,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a workout tracking and
          progression product operated by Zachariah John Harold Redfield. We aim to limit collection to
          information needed to provide, secure, support, bill, debug, and improve Fitness.
        </p>
        <p>
          Fitness is not a medical product. However, workout data can still be personal and sensitive because it may
          describe your training habits, physical activity, goals, notes, and progression history. We treat this
          information as product truth for your account experience.
        </p>
      </Section>

      <Section title="What We Collect">
        <p>We may collect the following categories of information:</p>
        <p className="font-semibold text-[rgb(var(--text-primary)/0.96)]">Account and authentication information</p>
        <p>
          This may include your email address, username or display name, authentication provider identifiers, internal
          user id, login or session metadata, and account settings.
        </p>
        <p className="font-semibold text-[rgb(var(--text-primary)/0.96)]">Workout and training information</p>
        <p>
          This may include routines, workout plans, exercises, sets, reps, load or weight targets, completion state,
          session history, notes, progression receipts, progression suggestions, streaks, and other activity you create
          or generate in the app.
        </p>
        <p className="font-semibold text-[rgb(var(--text-primary)/0.96)]">Pro, billing, and entitlement information</p>
        <p>
          Payments are processed by Stripe. We may store limited billing and entitlement records such as Stripe
          customer ids, checkout session ids, subscription ids, invoice or payment status identifiers, plan or tier,
          purchase state, entitlement state, renewal or cancellation state, and related timestamps.
        </p>
        <p>
          Fitness does not store full payment card numbers in the app database.
        </p>
        <p className="font-semibold text-[rgb(var(--text-primary)/0.96)]">
          App, device, diagnostic, and security information
        </p>
        <p>
          We may collect app and technical data needed to operate, secure, and debug the service. This may include
          device type, browser, operating system category, install context, route or page loads, event logs, error
          logs, IP address, timestamps, and security-related logs.
        </p>
        <p className="font-semibold text-[rgb(var(--text-primary)/0.96)]">Support, beta, and feedback information</p>
        <p>
          If you contact support, join a beta, or send feedback, we may collect the information you choose to provide,
          such as issue reports, screenshots, reproduction steps, Discord messages, or anonymized beta tester ids.
        </p>
      </Section>

      <Section title="What We Do Not Need">
        <p>
          Fitness does not require you to provide medical diagnoses, prescriptions, insurance information, government
          identifiers, emergency health information, or full payment card numbers.
        </p>
        <p>
          Do not add sensitive medical information, third-party personal information, or emergency information to
          workout notes or support messages unless you understand that it may be stored as part of your account or
          support history.
        </p>
      </Section>

      <Section title="How We Use Data">
        <BulletList
          items={[
            "authenticate your account",
            "save and restore workout state",
            "sync your history across devices",
            "generate and display progression guidance",
            "maintain routines, plans, notes, and session history",
            "determine Free or Pro entitlement state",
            "process, verify, grant, restore, suspend, or revoke Pro access",
            "provide support and investigate account issues",
            "debug errors and improve reliability",
            "protect the service from abuse, fraud, payment misuse, and security issues",
            "understand whether core product flows are working as intended",
          ]}
        />
      </Section>

      <Section title="Analytics And Diagnostics">
        <p>
          We may use bounded product analytics, diagnostics, and event data to understand whether key flows are
          working, such as install, login, workout loading, Pro checkout, and settings access.
        </p>
        <p>
          We do not sell your workout data. We do not use your private workout notes or workout history for targeted
          advertising.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Pro purchases and subscriptions are processed through Stripe-hosted checkout or other Stripe-hosted billing
          surfaces.
        </p>
        <p>
          Stripe may collect and process payment details under its own terms and privacy practices. Fitness stores only
          the billing identifiers and status information needed to verify payment state, grant or restore Pro access,
          troubleshoot billing issues, respond to payment disputes, and prevent entitlement mistakes.
        </p>
      </Section>

      <Section title="Sharing and Disclosure">
        <p>
          We may share information with service providers that help us operate the app, such as hosting,
          authentication, database, analytics, diagnostics, payment processing, billing, security, and support
          providers. These providers are allowed to process information only as needed to provide their services to
          Fitness.
        </p>
        <p>We may also disclose information when needed to:</p>
        <BulletList
          items={[
            "comply with law or valid legal process",
            "protect the rights, safety, and security of users, Fitness, or others",
            "investigate fraud, abuse, payment disputes, or security issues",
            "complete a business transfer such as a merger, acquisition, financing, or sale of assets, subject to appropriate protections",
          ]}
        />
        <p>
          We do not sell your workout data. We do not publish your private workout data. We do not share your private
          workout data with other users unless you choose to share it.
        </p>
      </Section>

      <Section title="Storage and Processing Location">
        <p>
          Your information may be processed in the countries where Fitness and its service providers operate. This may
          include Canada, the United States, or other locations depending on the infrastructure and providers used to
          operate the app.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          We keep account, workout, billing, entitlement, support, diagnostic, and security records for as long as
          needed to provide the service, preserve your training history, maintain account integrity, prevent
          entitlement mistakes, troubleshoot bugs, resolve disputes, comply with legal obligations, and protect against
          fraud or abuse.
        </p>
        <p>
          Some limited records may be retained longer when needed for payment disputes, tax or accounting records,
          security investigations, fraud prevention, debugging, backups, compliance, or legal claims.
        </p>
      </Section>

      <Section title="Deletion and Account Controls">
        <p>
          You may request deletion of your account or personal information through the private support path.
        </p>
        <p>
          When deletion is requested, we will delete or de-identify active account and workout records where reasonably
          available, unless we need to retain limited information for billing, security, fraud prevention, compliance,
          backups, dispute evidence, or legal reasons.
        </p>
        <p>
          If you request account deletion while a Stripe subscription is active, subscription cancellation must be
          completed through the billing flow or confirmed by support before destructive account deletion is completed.
          After deletion, account recovery may not be available.
        </p>
        <p>
          Deleting the app from your device does not automatically delete your server-side account, workout history,
          Pro subscription, or billing records.
        </p>
        <p>
          {FITNESS_PRIVATE_SUPPORT_PATH_LABEL}
        </p>
      </Section>

      <Section title="Access and Correction">
        <p>
          You may request access to or correction of account information associated with your Fitness account by
          contacting support. We may need to verify your account before fulfilling access, correction, export, or
          deletion requests.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use reasonable technical and organizational safeguards designed to protect account, workout, billing, and
          diagnostic information. No online service can guarantee perfect security, and you are responsible for keeping
          your login credentials secure.
        </p>
        <p>
          If we determine that a security incident requires user notice under applicable law, we will notify affected
          users through a reasonable method.
        </p>
      </Section>

      <Section title="Children and Teens">
        <p>Fitness is not directed to children under 13. Do not use Fitness if you are under 13.</p>
        <p>
          If you are under the age of majority where you live, you should use Fitness only with permission and
          supervision from a parent or guardian.
        </p>
        <p>
          Paid Pro subscriptions are intended only for users who are at least 18 years old or the age of
          majority where they live.
        </p>
        <p>
          If you believe a child under 13 has provided personal information to Fitness, contact support so we can
          review and delete the information where appropriate.
        </p>
      </Section>

      <Section title="Changes To This Policy">
        <p>
          We may update this Privacy Policy as the product, infrastructure, legal requirements, or business needs
          change. When we update it, we will revise the &quot;Last updated&quot; date. For material changes, we may provide
          additional notice in the app or through another reasonable method.
        </p>
      </Section>
    </LegalDocumentLayout>
  );
}
