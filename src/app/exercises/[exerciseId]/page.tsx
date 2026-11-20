import { redirect } from "next/navigation";
import { isSafeAppPath } from "@/lib/navigation-return";

type PageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

export default async function ExerciseDetailsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const returnHref = isSafeAppPath(searchParams?.returnTo) ? searchParams.returnTo : "/history/exercises";
  redirect(returnHref);
}
