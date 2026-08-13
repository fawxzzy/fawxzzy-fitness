import { InstallGateChrome, type InstallCopyState } from "@/components/install/InstallGateChrome";

type IOSAddToHomeScreenGateProps = {
  copyState: InstallCopyState;
  installUrl: string;
  onCopy: () => void;
  primaryHref?: string;
};

export function IOSAddToHomeScreenGate({
  copyState,
  installUrl,
  onCopy,
  primaryHref,
}: IOSAddToHomeScreenGateProps) {
  return (
    <InstallGateChrome
      copyState={copyState}
      eyebrow="Install Flow"
      installUrl={installUrl}
      onCopy={onCopy}
      primaryHref={primaryHref}
      primaryLabel={primaryHref ? "Continue" : undefined}
      title="Add Fitness to your Home Screen"
    >
      <ol className="space-y-2 rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.56)] px-4 py-4 text-center text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
        <li>1. Tap the browser Share button.</li>
        <li>2. Choose Add to Home Screen.</li>
        <li>3. Open Fitness from the new Home Screen icon.</li>
      </ol>
    </InstallGateChrome>
  );
}
