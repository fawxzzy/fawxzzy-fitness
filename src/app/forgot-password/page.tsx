import { redirect } from "next/navigation";
import { buildForgotPasswordAliasTarget, type ForgotPasswordSearchParams } from "@/app/forgot-password/alias-target";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: ForgotPasswordSearchParams;
};

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  redirect(buildForgotPasswordAliasTarget(searchParams));
}
