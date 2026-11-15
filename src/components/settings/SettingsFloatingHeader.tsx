import { ScreenHeader } from "@/components/ui/app/ScreenHeader";

// Settings is a tab screen: the standard header with the plain title. Who is signed in lives on the Account card in
// the body, and an open section shows its own card at the top of the body (never a second header row).
export function SettingsFloatingHeader() {
  return <ScreenHeader kind="tab" title="Settings" />;
}
