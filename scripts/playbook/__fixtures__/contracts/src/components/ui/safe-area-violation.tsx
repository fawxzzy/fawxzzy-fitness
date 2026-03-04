export function SafeAreaViolation() {
  return <div className="pt-[max(env(safe-area-inset-top),1rem)]">Unsafe</div>;
}
