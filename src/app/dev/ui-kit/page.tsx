import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Dev-only reference for the design foundation (docs/ui/FOUNDATION.md): every shared primitive in every state.
// `?open=sheet|confirm|field-error` opens that state on load (captures); `?shot=1` hides the Next dev badge.
export default async function DevUiKitPage(props: { searchParams?: Promise<{ open?: string; shot?: string }> }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const searchParams = await props.searchParams;

  const { UiKitShowcase } = await import("@/app/dev/ui-kit/UiKitShowcase");
  return <UiKitShowcase initialOpen={searchParams?.open ?? null} hideDevBadge={searchParams?.shot === "1"} />;
}
