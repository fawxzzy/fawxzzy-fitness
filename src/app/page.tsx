import { redirect } from "next/navigation";

import { getInstallRouteHrefForReturnTo } from "@/lib/install/config";

export default function HomePage() {
  redirect(getInstallRouteHrefForReturnTo("/login"));
}
