import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
export { ensureProfileWithClient } from "@/lib/profile-core";
import { ensureProfileWithClient } from "@/lib/profile-core";

export async function ensureProfile(userId: string) {
  const supabase = supabaseServer();
  return ensureProfileWithClient(userId, supabase as never);
}
