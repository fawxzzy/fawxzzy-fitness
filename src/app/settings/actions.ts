"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export type EmailUpdateState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE =
  "Unit preferences require the latest profile migration. Run migrations and try again.";

function isMissingProfilePreferenceColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesPreferenceColumn =
    message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit");
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

export async function updateAccountEmailAction(_previous: EmailUpdateState, formData: FormData): Promise<EmailUpdateState> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!nextEmail || !EMAIL_REGEX.test(nextEmail)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if ((user.email ?? "").toLowerCase() === nextEmail) {
    return { status: "success", message: "Email is already up to date." };
  }

  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) {
    return { status: "error", message: error.message || "Unable to update email right now." };
  }

  revalidatePath("/settings");
  return {
    status: "success",
    message: "Check your inbox to confirm this email change.",
  };
}

export async function updateUnitPreferencesAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const weightUnit = String(formData.get("weightUnit") ?? "");
  const distanceUnit = String(formData.get("distanceUnit") ?? "");

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false, error: "Weight unit must be lbs or kg." };
  }

  if (distanceUnit !== "mi" && distanceUnit !== "km") {
    return { ok: false, error: "Distance unit must be mi or km." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_weight_unit: weightUnit,
      preferred_distance_unit: distanceUnit,
    })
    .eq("id", user.id);

  if (error) {
    if (isMissingProfilePreferenceColumnError(error)) {
      return { ok: false, error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE };
    }
    return { ok: false, error: error.message || "Unable to save preferences." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
