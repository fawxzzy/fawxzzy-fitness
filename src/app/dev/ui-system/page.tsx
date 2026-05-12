import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DevUiSystemPage({
  searchParams,
}: {
  searchParams?: {
    fixture?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { default: DevUiSystemRoute } = await import("@/app/dev/ui-system/DevUiSystemRoute");
  return <DevUiSystemRoute searchParams={searchParams} />;
}
