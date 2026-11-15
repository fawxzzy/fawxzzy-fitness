import { InstallScreen } from "@/components/install/InstallGateChrome";

// iPhone Safari: steps only. Safari has no install action, so there is no button and no way past the guide.
export function IOSAddToHomeScreenGate() {
  return <InstallScreen kind="ios-safari" />;
}
