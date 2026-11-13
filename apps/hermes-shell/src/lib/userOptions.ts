export const USER_ROLES = ['readonly', 'user', 'operator', 'admin'] as const;
export const USER_LOCALES = ['en', 'es', 'pt-BR', 'fr'] as const;
export const USERNAME_PATTERN = /^[a-z0-9._-]{1,32}$/;
export const MAX_DISPLAY_NAME = 64;
export const MIN_PASSWORD_LENGTH = 8;
