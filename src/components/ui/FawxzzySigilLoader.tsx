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
  },
  md: {
    shell: "h-14 w-14",
    core: "h-11 w-11",
  },
  lg: {
    shell: "h-16 w-16",
    core: "h-14 w-14",
  },
  xl: {
    shell: "h-24 w-24",
    core: "h-[5.45rem] w-[5.45rem]",
  },
};

export function FawxzzySigilLoader({
  className,
  size = "md",
}: FawxzzySigilLoaderProps) {
  const scale = sizeClassNames[size];

  return (
    <div className={cn("relative grid place-items-center", scale.shell, className)} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[rgb(var(--loader-scan-rgb)/0.2)] blur-[18px]" />
      <div className="absolute inset-0 rounded-full border border-[rgb(var(--loader-scan-rgb)/0.2)]" />
      <div className="absolute inset-[4px] animate-spin rounded-full border border-transparent border-r-[rgb(var(--loader-scan-rgb)/0.44)] border-t-[rgb(var(--loader-scan-rgb)/0.92)]" />
      <div className="absolute inset-[9px] rounded-full border border-[rgb(var(--text)/0.08)]" />
      <div
        className="absolute inset-[11px] animate-pulse rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(var(--loader-scan-rgb) / 0.28), rgb(var(--loader-scan-rgb) / 0.04) 68%, transparent 100%)",
        }}
      />
      <div className={cn("relative grid place-items-center overflow-hidden", scale.core)}>
        <Image
          src="/app/loader-sigil.png"
          alt=""
          width={1024}
          height={1024}
          className="h-[124%] w-[124%] object-contain object-center mix-blend-screen opacity-95"
          style={{ transform: "translate(0.35%, 3.25%)" }}
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
