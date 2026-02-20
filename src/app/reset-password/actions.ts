"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function resetPasswordAction(formData: FormData) {
  await requireUser();
  const supabase = supabaseServer();

  const password = String(formData.get("password") ?? "").trim();

  if (password.length < 6) {
    redirect("/reset-password?error=Password%20must%20be%20at%20least%206%20characters");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?info=Password%20updated.%20You%20can%20log%20in%20now.");
}
