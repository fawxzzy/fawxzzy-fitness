import { NextRequest } from "next/server.js";
import { handleSessionKeepaliveRequest } from "@/lib/session-keepalive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSessionKeepaliveRequest(request);
}
