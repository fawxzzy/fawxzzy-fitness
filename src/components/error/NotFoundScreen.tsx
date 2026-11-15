import { AuthDockLink, AuthStatusScreen } from "@/components/auth/AuthShell";
import { ERROR_COPY } from "@/components/error/errorCopy";

// Server-safe: no auth call, no data fetch, no request data. /today is the right
// home for both states: signed-in users land there, signed-out users are sent to sign in.
// Auth Surface v2 status screen: app icon, title, one line, one action, centred.
export function NotFoundScreen() {
  return (
    <AuthStatusScreen
      testId="not-found-screen"
      title={ERROR_COPY.notFoundTitle}
      lead={ERROR_COPY.notFoundBody}
      action={<AuthDockLink href={ERROR_COPY.notFoundHref}>{ERROR_COPY.notFoundAction}</AuthDockLink>}
    />
  );
}
