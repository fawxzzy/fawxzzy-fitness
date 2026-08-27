import { redirect } from "next/navigation";
import { getFitnessAccountPortalUrl } from "@/lib/account-portal";

export default function AccountAliasPage() {
  redirect(getFitnessAccountPortalUrl());
}
