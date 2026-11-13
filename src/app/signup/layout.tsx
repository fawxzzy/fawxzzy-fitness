import type { ReactNode } from "react";
import { SignupEntry } from "@/app/signup/SignupEntry";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <SignupEntry>{children}</SignupEntry>;
}
