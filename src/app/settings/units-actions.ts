"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isMissingProfileSettingsColumnError, PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE } from "@/lib/dal/profile-settings";
import { supabaseServer } from "@/lib/supabase/server";
import { parseUnitsSettingsForm } from "@/lib/units-settings";

export type UpdateUnitsSettingsResult = { ok: true } | { ok: false; error: string };

const UNITS_SAVE_FAILED_MESSAGE = "Could not save units and time zone. Try again.";

/**
 * Settings "Units & time zone": saves weight unit, distance unit and time zone on the signed-in person's profile
 * (columns that already exist; no schema change). Routines keep their own zone and units, so this only changes the
 * defaults for new routines and the fallback zone when a routine has none.
 */
export async function updateUnitsSettingsAction(formData: FormData): Promise<UpdateUnitsSettingsResult> {
  const parsed = parseUnitsSettingsForm(formData);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await requireUser();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_weight_unit: parsed.values.weightUnit,
      preferred_distance_unit: parsed.values.distanceUnit,
      timezone: parsed.values.timeZone,
    })
    .eq("id", user.id);

  if (error) {
    if (isMissingProfileSettingsColumnError(error)) {
      return { ok: false, error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE };
    }
    console.error("[settings.units] save failed", { userId: user.id, message: error.message });
    return { ok: false, error: UNITS_SAVE_FAILED_MESSAGE };
  }

  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/history");
  return { ok: true };
}
