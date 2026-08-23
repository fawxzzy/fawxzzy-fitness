export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 15;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,15}$/;
export const USERNAME_VALIDATION_MESSAGE =
  "Username must be 2-15 characters and use letters, numbers, periods, underscores, or hyphens.";

export function isUsernameIdentifier(value: string) {
  return USERNAME_PATTERN.test(value.trim());
}
