import ForgotPasswordFormClient from "@/app/forgot-password/ForgotPasswordFormClient";
import { RecoverySessionBridge } from "@/app/reset-password/RecoverySessionBridge";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { authNotice, resetPasswordErrorNoticeId } from "@/components/auth/authMessages";
import { resolveResetPasswordErrorCopy } from "@/lib/auth-route-feedback";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    recovery?: string;
  }>;
};

// Link problems that belong on the request screen (send a new link); every other code stays on the new-password form.
const LINK_NOTICES = new Set(["reset.expired", "reset.invalid", "reset.rate"]);

export default async function ResetPasswordPage(props: ResetPasswordPageProps) {
  const searchParams = await props.searchParams;
  // `error` is an allow-listed code (auth-route-feedback.ts); anything else resolves to nothing.
  const error = resolveResetPasswordErrorCopy(searchParams?.error);
  const isRecoveryAttempt = searchParams?.recovery === "1";

  if (isRecoveryAttempt) {
    return <RecoverySessionBridge initialError={error} />;
  }

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const noticeId = resetPasswordErrorNoticeId(error);

  // An error from the NEW-password step (too short, not matching, same as before, too easy to guess, save failed) belongs
  // on the New password screen, whether or not this render can see the session (Web parity). It never touches the
  // account: saving without a recovery session answers with the expired-link notice on the request screen.
  const isNewPasswordStepError = Boolean(noticeId) && !LINK_NOTICES.has(noticeId as string);

  if (!data.user && !isNewPasswordStepError) {
    // No recovery session: never a dead end, it is the request screen with the reason in the box.
    return <ForgotPasswordFormClient initialNotice={authNotice(noticeId && LINK_NOTICES.has(noticeId) ? noticeId : "reset.expired")} />;
  }

  if (noticeId && LINK_NOTICES.has(noticeId) && noticeId !== "reset.rate") {
    return <ForgotPasswordFormClient signedInEmail={data.user?.email ?? null} initialNotice={authNotice(noticeId)} />;
  }

  // A fresh key per server render: the save action redirects back here with ?error=<code>, and a repeat of the same
  // code (the same password twice) must still free the dock and show the notice. Nothing strips this query.
  return <ResetPasswordForm key={Date.now()} error={error} />;
}
