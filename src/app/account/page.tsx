import { AccountScreen } from "@/components/account/AccountScreen";
import { requireUser } from "@/lib/auth";
import { resolveAccountReturnHref } from "@/lib/account-navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser({
    gate: "account.auth.session",
    route: "/account",
    blockingReason: "Waiting for the authenticated Fitness session before opening Account.",
    timeoutMs: 5000,
  });
  const rawMetadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata as Record<string, unknown>
    : {};
  const username = typeof rawMetadata.username === "string"
    ? rawMetadata.username.trim()
    : typeof rawMetadata.display_name === "string"
      ? rawMetadata.display_name.trim()
      : "";
  const requestedReturnTo = Array.isArray(searchParams?.returnTo)
    ? searchParams.returnTo[0]
    : searchParams?.returnTo;

  return (
    <AccountScreen
      email={user.email ?? ""}
      username={username}
      returnHref={resolveAccountReturnHref(requestedReturnTo)}
    />
  );
}
