import { NextResponse } from "next/server";

import { buildAtlasHealthPayload } from "@/lib/atlas-contracts";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(buildAtlasHealthPayload(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
