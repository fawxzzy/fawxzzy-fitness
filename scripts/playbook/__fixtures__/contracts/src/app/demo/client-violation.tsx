"use client";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export function ClientViolation() {
  const supabase = supabaseServer();
  supabase.from("sessions").select("id");
  return null;
}
