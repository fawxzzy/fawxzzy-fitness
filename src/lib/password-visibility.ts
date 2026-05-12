export function resolvePasswordInputType(isVisible: boolean): "password" | "text" {
  return isVisible ? "text" : "password";
}

export function resolvePasswordVisibilityToggleLabel(isVisible: boolean) {
  return isVisible ? "Hide password" : "Show password";
}
