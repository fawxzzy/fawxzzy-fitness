import { RouteLoading } from "@/components/RouteLoading";

export default function SessionLoading() {
  return (
    <RouteLoading
      label="Opening workout"
      detail="Loading your current session."
      gateName="session.route-loading"
      blockingReason="Waiting for the current session to render."
      timeoutMs={5000}
    />
  );
}
