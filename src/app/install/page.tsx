import { InstallRouteSurface } from "@/components/install/InstallRouteSurface";

type InstallPageProps = {
  searchParams?: {
    installContext?: string;
  };
};

export default function InstallPage({ searchParams }: InstallPageProps) {
  return <InstallRouteSurface initialInstallContext={searchParams?.installContext ?? null} />;
}
