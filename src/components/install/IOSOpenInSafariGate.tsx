import { InstallGateChrome, type InstallCopyState } from "@/components/install/InstallGateChrome";

type IOSOpenInSafariGateProps = {
  copyState: InstallCopyState;
  installUrl: string;
  onCopy: () => void;
  primaryHref?: string;
  primaryLabel?: string;
};

export function IOSOpenInSafariGate({
  copyState,
  installUrl,
  onCopy,
  primaryHref,
  primaryLabel,
}: IOSOpenInSafariGateProps) {
  return (
    <InstallGateChrome
      copyState={copyState}
      eyebrow="Install Flow"
      installUrl={installUrl}
      onCopy={onCopy}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      showCopyButton
      showInstallUrlCard
      title="Open Fitness in Safari"
    >
      <ol className="space-y-2 rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.56)] px-4 py-4 text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
        <li>1. Copy this link.</li>
        <li>2. Open Safari.</li>
        <li>3. Paste the link and keep going there.</li>
      </ol>
    </InstallGateChrome>
  );
}
