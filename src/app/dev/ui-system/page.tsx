import { notFound } from "next/navigation";
import { ContentRail } from "@/components/layout/ContentRail";
import { UiSystemShowcase } from "@/app/dev/ui-system/UiSystemShowcase";
import { resolveUiSystemFixture } from "@/lib/dev/uiSystemFixtures";

export const dynamic = "force-dynamic";

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
