# ADR-002: WebSocket Client Architecture

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

Both `hermes-gps-final` and `hermes-chat-final` need real-time data from the [hermes-radio-daemon](https://github.com/Rhizomatica/hermes-radio-daemon) WebSocket server. The daemon emits events for GPS position updates, message delivery notifications, station online/offline status, and caller logs.

Two apps consume the same WebSocket but subscribe to different event types. A shared WebSocket connection (one per browser tab) reduces server load and simplifies connection management.

## Decision

**We will build a shared `WebSocketProvider` in a new `@hermes/shared-auth` package** (to be renamed `@hermes/shared-core` or remain as-is — the auth package also hosts the WS provider since it's a core infrastructure concern). The provider:

1. Establishes a single WebSocket connection to `hermes-radio-daemon` per browser context
2. Implements an event-based subscription model
3. Handles reconnection with exponential backoff
4. Broadcasts connection state to all subscribers

### Provider API

```typescript
// packages/shared-auth/src/WebSocketProvider.tsx

interface WebSocketContextValue {
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  subscribe<T>(eventType: string, callback: (payload: T) => void): () => void;
  send(eventType: string, payload: unknown): void;
}

// Usage in any component:
function GpsTracker() {
  const { connectionState, subscribe } = useWebSocket();

  useEffect(() => {
    const unsub = subscribe('gps.position', (pos: GpsPosition) => {
      setCoords(pos);
    });
    return unsub;
  }, [subscribe]);
}
```

### Reconnection Strategy

| Attempt | Delay | Max Jitter |
|---|---|---|
| 1 | 1s | ±200ms |
| 2 | 2s | ±400ms |
| 3 | 4s | ±800ms |
| 4 | 8s | ±1.6s |
| 5 | 16s | ±3.2s |
| 6+ | 30s | ±5s |

Heartbeat: client sends `ping` every 30s. If no `pong` within 10s, connection is considered dead and reconnection begins.

### Event Catalog

Events consumed from `hermes-radio-daemon`:

| Event Type | Consumed By | Payload |
|---|---|---|
| `gps.position` | `hermes-gps-final` | `{ latitude, longitude, altitude, speed, heading, timestamp }` |
| `gps.fix` | `hermes-gps-final` | `{ quality, satellites, hdop }` |
| `message.new` | `hermes-chat-final` | `Message` object |
| `message.delivered` | `hermes-chat-final` | `{ messageId, timestamp, station }` |
| `message.synced` | `hermes-chat-final` | `{ messageId, station }` |
| `station.online` | `hermes-chat-final` | `{ stationId, timestamp }` |
| `station.offline` | `hermes-chat-final` | `{ stationId, timestamp }` |
| `caller.new` | `hermes-chat-final` | `CallerEntry` object |

Events sent to `hermes-radio-daemon` (future phases):

| Event Type | Sent By | Payload |
|---|---|---|
| `message.send` | `hermes-chat-final` | `SendPayload` |
| `typing.start` | `hermes-chat-final` | `{ station }` |
| `typing.stop` | `hermes-chat-final` | `{ station }` |

## Consequences

### Positive
- Single WebSocket connection shared across all apps (browser-native connection pooling)
- Event-based subscription prevents tightly coupling GPS logic to chat logic
- Reconnection logic is implemented once, tested once
- `connectionState` enables UI indicators ("Connecting...", "Offline") in all apps

### Negative
- WebSocket disconnection affects both apps simultaneously (cannot have GPS working while chat is disconnected)
- Event type strings are not type-checked at compile time (mitigated by typed wrapper functions in each app's domain hooks)
- Provider must be placed high in the component tree (above both app routers), which may complicate lazy loading

### Mitigations
- Each domain hook (`useGpsCoords`, `useChatData`) wraps `subscribe` with typed interfaces — raw event strings are never used in components
- Apps degrade gracefully when `connectionState !== 'connected'`: GPS falls back to REST polling, Chat shows "offline" badge
- The provider uses React Context with a stable reference — it does not cause unnecessary re-renders

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Per-app WebSocket connections | Two connections to same daemon waste server resources; no benefit since events are already namespaced |
| Socket.IO instead of raw WebSocket | `hermes-radio-daemon` uses raw WebSocket with `hermes-v1` subprotocol; adding Socket.IO would require daemon changes |
| SSE (Server-Sent Events) instead of WebSocket | Unidirectional — cannot send `message.send` or typing indicators to daemon in future phases |
| No shared provider — each hook manages its own WS | Duplicates connection logic, reconnection logic, and connection state tracking across hooks |

## References

- hermes-radio-daemon: `https://github.com/Rhizomatica/hermes-radio-daemon`
- WebSocket subprotocol: `hermes-v1` (as specified in `frontend-arch.agent.md` §WebSocket)
- Frontend Architect agent: `§Real-Time UI & Chat Experience`