import { Suspense } from "react";
import { InstallRouteSurface } from "@/components/install/InstallRouteSurface";

type InstallPageProps = {
  searchParams?: Promise<{
    installContext?: string;
    returnTo?: string;
  }>;
};

export default async function InstallPage(props: InstallPageProps) {
  const searchParams = await props.searchParams;
  return (
    <Suspense fallback={null}>
      <InstallRouteSurface
        initialInstallContext={searchParams?.installContext ?? null}
        initialReturnTo={searchParams?.returnTo ?? null}
      />
    </Suspense>
  );
}
