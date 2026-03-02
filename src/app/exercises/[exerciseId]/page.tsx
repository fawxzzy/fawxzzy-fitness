import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: {
    returnTo?: string;
  };
};

export default async function ExerciseDetailsPage({ searchParams }: PageProps) {
  const returnHref = searchParams?.returnTo?.startsWith("/") ? searchParams.returnTo : "/history/exercises";
  redirect(returnHref);
}
