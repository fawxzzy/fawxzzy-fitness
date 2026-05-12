import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { ContentRail } from "@/components/layout/ContentRail";
import { resolveUiSystemFixture } from "@/lib/dev/uiSystemFixtures";

export const dynamic = "force-dynamic";

const UiSystemShowcase = nextDynamic(() => import("@/app/dev/ui-system/UiSystemShowcase").then((mod) => mod.UiSystemShowcase), {
  ssr: true,
});

export default function DevUiSystemPage({
  searchParams,
}: {
  searchParams?: {
    fixture?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const fixture = resolveUiSystemFixture(searchParams?.fixture);

  return (
    <ContentRail>
      <UiSystemShowcase fixtureId={fixture.id} />
    </ContentRail>
  );
}
