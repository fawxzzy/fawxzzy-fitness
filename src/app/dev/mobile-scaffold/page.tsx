import { notFound } from "next/navigation";
import { MobileScaffoldDemo } from "@/app/dev/mobile-scaffold/MobileScaffoldDemo";

export const dynamic = "force-static";

export default function DevMobileScaffoldPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <MobileScaffoldDemo />;
}
