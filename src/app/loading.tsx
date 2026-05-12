import { RouteLoading } from "@/components/RouteLoading";

export default function AppLoading() {
  return (
    <RouteLoading
      label="Opening FawxzzyFitness"
      detail="Preparing your start screen."
      variant="boot"
      gateName="app.boot.root"
      blockingReason="Opening the root app shell."
    />
  );
}
