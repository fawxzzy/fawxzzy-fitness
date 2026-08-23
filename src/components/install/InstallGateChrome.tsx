import { AuthIntro, AuthShell } from "@/components/auth/AuthShell";

type InstallGateChromeProps = {
  steps: readonly string[];
};

export type InstallCopyState = "idle" | "copied" | "error";

export function InstallGateChrome({ steps }: InstallGateChromeProps) {
  return (
    <AuthShell
      header={<AuthIntro eyebrow="" title="Install" />}
      className="justify-start pt-[118px]"
    >
      <ol
        aria-label="Install Fitness"
        className="mx-auto grid w-full max-w-none gap-0 [&>li+li]:border-t [&>li+li]:border-[rgb(var(--border-strong)/0.32)]"
      >
        {steps.map((step, index) => (
          <li
            className="grid min-h-[82px] grid-cols-[42px_1fr] items-center gap-[14px] bg-transparent px-0 py-0 text-left"
            key={step}
          >
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-current text-sm font-medium text-[rgb(var(--accent))]">
              {index + 1}
            </span>
            <span className="text-[15px] leading-6 text-[rgb(var(--text-primary)/0.96)]">{step}</span>
          </li>
        ))}
      </ol>
    </AuthShell>
  );
}
