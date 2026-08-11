/**
 * @hermes/shared-auth
 *
 * Authentication, WebSocket, and locale providers shared across
 * all three HERMES apps (shell, GPS, chat).
 *
 * See ADR-003, ADR-006 for architecture decisions.
 */

// Public API will be exported here as modules are implemented
// in Phase 1 tasks: AuthProvider, useAuth, useAuthGuard,
// WebSocketProvider, useWebSocket, LocaleProvider, useLocale.