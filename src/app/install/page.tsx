import { Suspense } from "react";
import { InstallRouteSurface } from "@/components/install/InstallRouteSurface";

type InstallPageProps = {
  searchParams?: {
    installContext?: string;
  };
};

export default function InstallPage({ searchParams }: InstallPageProps) {
  return (
    <Suspense fallback={null}>
      <InstallRouteSurface initialInstallContext={searchParams?.installContext ?? null} />
    </Suspense>
  );
}
