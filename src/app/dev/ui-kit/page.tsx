import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Dev-only reference for the design foundation (docs/ui/FOUNDATION.md): every shared primitive in every state.
export default async function DevUiKitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { UiKitShowcase } = await import("@/app/dev/ui-kit/UiKitShowcase");
  return <UiKitShowcase />;
}
