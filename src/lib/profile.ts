import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
export { ensureProfileWithClient } from "@/lib/profile-core";
import { ensureProfileForEntryBootstrap as ensureProfileForEntryBootstrapWithImpl, ensureProfileWithClient } from "@/lib/profile-core";

export async function ensureProfile(userId: string) {
  const supabase = supabaseServer();
  return ensureProfileWithClient(userId, supabase as never);
}

export async function ensureProfileForEntryBootstrap(userId: string) {
  return ensureProfileForEntryBootstrapWithImpl(userId, {
    ensureProfileImpl: ensureProfile,
  });
}
