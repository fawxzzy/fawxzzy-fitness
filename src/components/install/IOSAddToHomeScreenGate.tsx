import { InstallGateChrome, type InstallCopyState } from "@/components/install/InstallGateChrome";
import { FITNESS_INSTALL_STEPS } from "@/components/install/InstallRouteSurface";

type IOSAddToHomeScreenGateProps = {
  copyState: InstallCopyState;
  installUrl: string;
  onCopy: () => void;
  primaryHref?: string;
};

export function IOSAddToHomeScreenGate({
  copyState: _copyState,
  installUrl: _installUrl,
  onCopy: _onCopy,
  primaryHref: _primaryHref,
}: IOSAddToHomeScreenGateProps) {
  return <InstallGateChrome steps={FITNESS_INSTALL_STEPS} />;
}
