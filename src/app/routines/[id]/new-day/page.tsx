import { redirect } from "next/navigation";
import { getRoutineDayCreateHref } from "@/lib/routine-day-navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyCreateRoutineDayPage({ params }: PageProps) {
  const { id } = await params;
  redirect(getRoutineDayCreateHref(id));
}
