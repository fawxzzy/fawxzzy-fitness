import { NextResponse } from "next/server";
import { CURRENT_APP_BUILD } from "@/lib/app-build";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(CURRENT_APP_BUILD, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
