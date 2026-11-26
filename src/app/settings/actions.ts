"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { QA_LLEL_VISIBILITY_COOKIE } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";

const PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE =
  "QA visibility settings require the latest profile migration. Run migrations and try again.";

function isMissingProfileSettingsColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesPreferenceColumn =
    message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit") || message.includes("show_qa_llel_data");
  const referencesProfilesTable = message.includes("profiles");
  const schemaCacheMissingColumn = message.includes("schema cache");
  const postgresMissingColumn =
    message.includes("column") && message.includes("does not exist") && referencesProfilesTable;

  return (
    referencesPreferenceColumn &&
    referencesProfilesTable &&
    (schemaCacheMissingColumn || postgresMissingColumn)
  );
}

// Unit preferences save through units-actions.ts (updateUnitsSettingsAction). The old
// weight/distance-only updateUnitPreferencesAction had no callers and was removed (PR #324 review).

export async function updateQaLlelVisibilityAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await supabaseServer();
  const showQaLlelData = String(formData.get("showQaLlelData") ?? "") === "1";
  const cookieStore = await cookies();

  const { error } = await supabase
    .from("profiles")
    .update({
      show_qa_llel_data: showQaLlelData,
    })
    .eq("id", user.id);

  if (error) {
    if (isMissingProfileSettingsColumnError(error)) {
      if (process.env.NODE_ENV !== "production") {
        cookieStore.set(QA_LLEL_VISIBILITY_COOKIE, showQaLlelData ? "1" : "0", {
          path: "/",
          sameSite: "lax",
        });
        revalidatePath("/settings");
        revalidatePath("/routines");
        revalidatePath("/history");
        return { ok: true };
      }
      return { ok: false, error: PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE };
    }
    return { ok: false, error: error.message || "Unable to save QA visibility." };
  }

  cookieStore.set(QA_LLEL_VISIBILITY_COOKIE, showQaLlelData ? "1" : "0", {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/settings");
  revalidatePath("/routines");
  revalidatePath("/history");
  return { ok: true };
}
