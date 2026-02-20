"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function updatePassword(newPassword: string) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      ok: false as const,
      error: "Reset link expired. Request a new password reset.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (!error) {
    return { ok: true as const };
  }

  const message = error.message.toLowerCase();
  if (message.includes("auth session missing") || message.includes("jwt") || message.includes("session")) {
    return {
      ok: false as const,
      error: "Reset link expired. Request a new password reset.",
    };
  }

  return { ok: false as const, error: "Could not update password. Please try again." };
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (password.length < 6) {
    redirect("/reset-password?error=Password%20must%20be%20at%20least%206%20characters");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=Passwords%20must%20match");
  }

  const result = await updatePassword(password);

  if (!result.ok) {
    redirect(`/reset-password?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/today");
}
