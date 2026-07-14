import { redirect } from "next/navigation";

import { AUTH_MODE_COPY } from "@/components/auth/authCopy";
import { AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { getInstallRouteHrefForReturnTo, INSTALLED_APP_QUERY_PARAM, INSTALL_BYPASS_QUERY_PARAM } from "@/lib/install/config";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: {
    error?: string;
    info?: string;
    [INSTALLED_APP_QUERY_PARAM]?: string;
    [INSTALL_BYPASS_QUERY_PARAM]?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  if (searchParams?.[INSTALL_BYPASS_QUERY_PARAM] !== "1" && searchParams?.[INSTALLED_APP_QUERY_PARAM] !== "1") {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === INSTALL_BYPASS_QUERY_PARAM || key === INSTALLED_APP_QUERY_PARAM || typeof value !== "string" || !value) {
        continue;
      }
      params.set(key, value);
    }

    const returnToInstallTarget = params.size > 0 ? `/signup?${params.toString()}` : "/signup";
    redirect(getInstallRouteHrefForReturnTo(returnToInstallTarget));
  }

  const copy = AUTH_MODE_COPY["create-account"];

  return (
    <AuthShell
      header={<AuthIntro eyebrow="" title={copy.title} subtitle={copy.subtitle} />}
    >
      <SignupForm error={searchParams?.error} info={searchParams?.info} />
    </AuthShell>
  );
}
