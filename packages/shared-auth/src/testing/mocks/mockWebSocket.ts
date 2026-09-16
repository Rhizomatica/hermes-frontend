import type { WebSocketContextValue, WebSocketEvent } from '../../useWebSocket';

export function mockWebSocket(initialConnected = true) {
  const handlers = new Map<string, Set<(event: WebSocketEvent) => void>>();

  const value: WebSocketContextValue = {
    connected: initialConnected,
    lastEvent: null,
    subscribe: (eventType: string, handler: (event: WebSocketEvent) => void) => {
      if (!handlers.has(eventType)) handlers.set(eventType, new Set());
      handlers.get(eventType)?.add(handler);
      return () => { handlers.get(eventType)?.delete(handler); };
    },
  };

  function emit(event: WebSocketEvent) {
    value.lastEvent = event;
    handlers.get(event.type)?.forEach((h) => h(event));
  }

  return { value, emit };
}