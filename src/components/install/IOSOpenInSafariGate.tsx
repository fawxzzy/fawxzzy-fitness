import { InstallScreen, type InstallCopyState } from "@/components/install/InstallGateChrome";

type IOSOpenInSafariGateProps = {
  copyState: InstallCopyState;
  onCopy: () => void;
};

// iPhone in-app browser (Instagram, Gmail...): it cannot add to the home screen, so open in Safari first.
export function IOSOpenInSafariGate({ copyState, onCopy }: IOSOpenInSafariGateProps) {
  return <InstallScreen kind="ios-inapp" copyState={copyState} onCopy={onCopy} />;
}
