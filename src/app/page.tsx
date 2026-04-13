import { InstallEntryGate } from "@/components/install/InstallEntryGate";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <InstallEntryGate continueHref={user ? "/entry" : "/login"} />;
}
