export const USER_ROLES = ['readonly', 'user', 'operator', 'admin'] as const;
export const USER_LOCALES = ['en', 'es', 'pt-BR', 'fr'] as const;
export const USERNAME_PATTERN = /^[a-z0-9._-]{1,32}$/;
export const RESERVED_USERNAMES = ['root'] as const;
export const MAX_DISPLAY_NAME = 64;
export const MIN_PASSWORD_LENGTH = 8;

export type UserRole = (typeof USER_ROLES)[number];
export type UserLocale = (typeof USER_LOCALES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function isUserLocale(value: string | null): value is UserLocale {
  return value != null && (USER_LOCALES as readonly string[]).includes(value);
}

/** The daemon counts display_name in Unicode code points, not UTF-16 units. */
export function displayNameLength(value: string): number {
  return Array.from(value).length;
}

export function isReservedUsername(value: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(value);
}
