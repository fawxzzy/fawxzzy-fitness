import { redirect } from "next/navigation";
import { getRoutineOverviewHref } from "@/lib/routine-day-navigation";

export const dynamic = "force-dynamic";

export default function RetiredRoutineDayDetailPage() {
  redirect(getRoutineOverviewHref());
}
