/** Normalized handle for @mentions / notifications (lowercase a-z, 0-9, _). */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/** For controlled inputs: lowercase, strip invalid characters, cap length. */
export function sanitizeUsernameTyping(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX);
}

/** Returns an error message if invalid; `null` if valid. Empty string is valid (clear username). */
export function validateUsernameFormat(normalized: string): string | null {
  if (normalized === "") return null;
  if (normalized.length < USERNAME_MIN || normalized.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Use only lowercase letters, numbers, and underscores.";
  }
  return null;
}
