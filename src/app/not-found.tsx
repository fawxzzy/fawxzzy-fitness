import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/error/NotFoundScreen";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <NotFoundScreen />;
}
