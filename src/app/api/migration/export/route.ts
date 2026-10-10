import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "FITNESS_LEGACY_EXPORT_RETIRED",
      error: "Legacy Fitness export is retired. Retained snapshots can still be imported.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
