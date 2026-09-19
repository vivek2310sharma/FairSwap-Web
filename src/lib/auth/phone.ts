export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

export function isE164PhoneNumber(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(normalizePhoneNumber(value));
}
