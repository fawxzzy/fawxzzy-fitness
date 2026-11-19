import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

export default async function ExerciseDetailsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const returnHref = searchParams?.returnTo?.startsWith("/") ? searchParams.returnTo : "/history/exercises";
  redirect(returnHref);
}
