const ALLOWED_DOMAIN = "ultrashaheens.com";

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return false;
  const domain = normalized.slice(at + 1);
  return domain === ALLOWED_DOMAIN;
}
