import type { WebSocketContextValue, WsTopicEvent } from '../../useWebSocket';

export function mockWebSocket(initialConnected = true) {
  const handlers = new Map<string, Set<(event: WsTopicEvent) => void>>();

  const value: WebSocketContextValue = {
    connectionState: initialConnected ? 'connected' : 'disconnected',
    connected: initialConnected,
    hello: null,
    lastEvent: null,
    subscribe: (topic: string, handler: (event: WsTopicEvent) => void) => {
      if (!handlers.has(topic)) handlers.set(topic, new Set());
      handlers.get(topic)?.add(handler);
      return () => { handlers.get(topic)?.delete(handler); };
    },
    sendCommand: async () => undefined,
  };

  function emit(topic: string, data: unknown, extra?: Partial<WsTopicEvent>) {
    const event: WsTopicEvent = {
      topic,
      seq: extra?.seq ?? 0,
      ts: extra?.ts ?? new Date().toISOString(),
      snapshot: extra?.snapshot ?? true,
      data,
    };
    value.lastEvent = event;
    handlers.get(topic)?.forEach((h) => h(event));
  }

  return { value, emit };
}