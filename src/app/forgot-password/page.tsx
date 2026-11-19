import { redirect } from "next/navigation";
import { buildForgotPasswordAliasTarget, type ForgotPasswordSearchParams } from "@/app/forgot-password/alias-target";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: Promise<ForgotPasswordSearchParams>;
};

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const searchParams = await props.searchParams;
  redirect(buildForgotPasswordAliasTarget(searchParams));
}
