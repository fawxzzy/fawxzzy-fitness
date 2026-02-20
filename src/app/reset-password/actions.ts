"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function updatePassword(newPassword: string) {
  const supabase = supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (!error) {
    return { ok: true as const };
  }

  const message = error.message.toLowerCase();
  if (message.includes("auth session missing") || message.includes("jwt") || message.includes("session")) {
    return {
      ok: false as const,
      error: "Reset link expired, request a new one.",
    };
  }

  return { ok: false as const, error: error.message };
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();

  if (password.length < 6) {
    redirect("/reset-password?error=Password%20must%20be%20at%20least%206%20characters");
  }

  const result = await updatePassword(password);

  if (!result.ok) {
    redirect(`/reset-password?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/today");
}
