import { InstallGateChrome, type InstallCopyState } from "@/components/install/InstallGateChrome";
import { FITNESS_INSTALL_STEPS } from "@/components/install/InstallRouteSurface";

type IOSOpenInSafariGateProps = {
  copyState: InstallCopyState;
  installUrl: string;
  onCopy: () => void;
  primaryHref?: string;
  primaryLabel?: string;
};

export function IOSOpenInSafariGate({
  copyState: _copyState,
  installUrl: _installUrl,
  onCopy: _onCopy,
  primaryHref: _primaryHref,
  primaryLabel: _primaryLabel,
}: IOSOpenInSafariGateProps) {
  return <InstallGateChrome steps={FITNESS_INSTALL_STEPS} />;
}
