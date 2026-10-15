// FP-MAN-012: new passwords match the shared account portal minimum.
// Passwords are opaque: never trim, normalize, truncate or coerce them.
export const NEW_PASSWORD_MINIMUM = 10;
export const NEW_PASSWORD_REQUIREMENT = `Use at least ${NEW_PASSWORD_MINIMUM} characters. Longer passphrases are welcome.`;

export function isValidNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= NEW_PASSWORD_MINIMUM;
}
