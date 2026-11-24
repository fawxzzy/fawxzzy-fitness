import { RouteLoading } from "@/components/RouteLoading";

export default function AddExerciseLoading() {
  return (
    <RouteLoading
      label="Opening exercise library…"
      detail="Loading exercises and your recent history."
      gateName="add-exercise.route-loading"
      blockingReason="Waiting for the exercise library to render."
      timeoutMs={5000}
    />
  );
}
