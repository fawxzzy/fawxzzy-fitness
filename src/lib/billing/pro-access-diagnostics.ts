export type ProAccessLoadStage = "entitlements" | "purchases" | "customer";

type LoadErrorLike = { message?: string; code?: string; details?: string; hint?: string } | null | undefined;

export type ProAccessLoadFailure = {
  tag: "[billing.pro-access]";
  stage: ProAccessLoadStage;
  code: string | null;
  message: string;
};

/**
 * Builds the server log record for a billing read that failed for a reason other than a missing
 * schema. The member sees the "setup" snapshot with a support note either way; without this record
 * a grant change that revokes read access to the billing tables would silently turn paying members
 * into Free members with nothing in the logs. Carries the stage, the provider error code and the
 * message only: no user id, no row data.
 */
export function describeProAccessLoadFailure(stage: ProAccessLoadStage, error: LoadErrorLike): ProAccessLoadFailure {
  return {
    tag: "[billing.pro-access]",
    stage,
    code: typeof error?.code === "string" && error.code.length > 0 ? error.code : null,
    message: typeof error?.message === "string" && error.message.length > 0 ? error.message.slice(0, 300) : "unknown error",
  };
}

export function logProAccessLoadFailure(stage: ProAccessLoadStage, error: LoadErrorLike) {
  console.error(describeProAccessLoadFailure(stage, error));
}
