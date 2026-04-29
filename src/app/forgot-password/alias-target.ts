type ForgotPasswordSearchParams = {
  error?: string;
  info?: string;
  verified?: string;
};

export function buildForgotPasswordAliasTarget(searchParams?: ForgotPasswordSearchParams) {
  const nextSearchParams = new URLSearchParams();

  if (searchParams?.error) {
    nextSearchParams.set("error", searchParams.error);
  }

  if (searchParams?.info) {
    nextSearchParams.set("info", searchParams.info);
  }

  if (searchParams?.verified) {
    nextSearchParams.set("verified", searchParams.verified);
  }

  const query = nextSearchParams.toString();
  return query ? `/login?${query}` : "/login";
}

export type { ForgotPasswordSearchParams };
