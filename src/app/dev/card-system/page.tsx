import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentRail } from "@/components/layout/ContentRail";
import { CardSystemGallery } from "@/app/dev/card-system/CardSystemGallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Dev-only gallery of the card system (docs/design-system/CARD-SYSTEM.md): every card kind in every state.
 * Mirrors /dev/ui-system: it is blocked outright in production (no preview-env escape hatch), so it can
 * never be a public fixture route.
 */
export default function DevCardSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <ContentRail className="pb-24 pt-6">
      <CardSystemGallery />
    </ContentRail>
  );
}
