import Image from "next/image";
import { cn } from "@/lib/cn";

type FawxzzySigilLoaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClassNames = {
  sm: {
    shell: "h-10 w-10",
    core: "h-8 w-8",
    image: "h-[148%] w-[148%]",
  },
  md: {
    shell: "h-14 w-14",
    core: "h-11 w-11",
    image: "h-[146%] w-[146%]",
  },
  lg: {
    shell: "h-16 w-16",
    core: "h-14 w-14",
    image: "h-[144%] w-[144%]",
  },
  xl: {
    shell: "h-24 w-24",
    core: "h-[5.45rem] w-[5.45rem]",
    image: "h-[142%] w-[142%]",
  },
};

export function FawxzzySigilLoader({
  className,
  size = "md",
}: FawxzzySigilLoaderProps) {
  const scale = sizeClassNames[size];

  return (
    <div className={cn("relative grid place-items-center", scale.shell, className)} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[rgb(var(--loader-scan-rgb)/0.24)] blur-[20px]" />
      <div className="absolute inset-0 rounded-full border border-[rgb(var(--loader-scan-rgb)/0.14)]" />
      <div className="absolute inset-[4px] animate-spin rounded-full border border-transparent border-r-[rgb(var(--loader-scan-rgb)/0.44)] border-t-[rgb(var(--loader-scan-rgb)/0.92)]" />
      <div className="absolute inset-[9px] rounded-full border border-[rgb(var(--loader-scan-rgb)/0.09)]" />
      <div
        className="absolute inset-[11px] animate-pulse rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(var(--loader-scan-rgb) / 0.34), rgb(var(--loader-scan-rgb) / 0.07) 62%, transparent 100%)",
        }}
      />
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-full",
          "bg-[radial-gradient(circle,rgb(var(--loader-scan-rgb)/0.18)_0%,rgb(var(--surface)/0.1)_45%,transparent_76%)]",
          scale.core,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "inset 0 0 0 1px rgb(var(--loader-scan-rgb) / 0.08), inset 0 0 26px rgb(var(--loader-scan-rgb) / 0.14)",
          }}
        />
        <Image
          src="/app/loader-sigil.png"
          alt=""
          width={1024}
          height={1024}
          className={cn(
            "relative object-cover object-center opacity-[0.98] saturate-[1.08] mix-blend-screen",
            "[mask-image:radial-gradient(circle,black_0%,black_55%,rgba(0,0,0,0.94)_63%,transparent_78%)]",
            scale.image,
          )}
          style={{ transform: "translate(0.35%, 2.25%)" }}
          priority
        />
      </div>
      <div
        className="absolute inset-0 animate-spin rounded-full [mask-image:conic-gradient(from_0deg,transparent_0deg,black_38deg,transparent_82deg)]"
        style={{
          background: "conic-gradient(from 0deg, rgb(var(--loader-scan-rgb) / 0) 0deg, rgb(var(--loader-scan-rgb) / 0.55) 34deg, rgb(var(--loader-scan-rgb) / 0.18) 68deg, rgb(var(--loader-scan-rgb) / 0) 118deg)",
          animationDuration: "2.4s",
        }}
      />
    </div>
  );
}
