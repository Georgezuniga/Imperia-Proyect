export const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "@imperia.com").toLowerCase();

export function isAllowedEmail(email) {
  return typeof email === "string" && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function requireFields(body, fields = []) {
  for (const f of fields) {
    if (body?.[f] === undefined || body?.[f] === null || body?.[f] === "") {
      return f;
    }
  }
  return null;
}
