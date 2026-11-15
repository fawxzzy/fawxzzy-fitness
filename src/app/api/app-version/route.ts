import { NextResponse } from "next/server";
import { CURRENT_APP_BUILD, CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { resolveMinBuildId } from "@/lib/app-update-policy";

export const dynamic = "force-dynamic";

export function GET() {
  // minBuildId: clients on any other build apply the update at their next
  // boundary (hidden, cold launch, navigation); see src/lib/app-update-policy.ts.
  return NextResponse.json({
    ...CURRENT_APP_BUILD,
    minBuildId: resolveMinBuildId(CURRENT_APP_BUILD_ID),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
