import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGpsCoords } from './useGpsCoords';

// Mock @hermes/shared-auth WebSocket
const mockSubscribe = vi.fn();
const mockUnsub = vi.fn();
// Mutable connection state so individual tests can simulate a disconnected
// WebSocket. The `vi.mock` factory is hoisted above module evaluation, so this
// state must live in `vi.hoisted` to avoid TDZ/reference errors.
const mockConnected = vi.hoisted(() => ({ current: true }));

vi.mock('@hermes/shared-auth', () => ({
  useWebSocket: () => ({
    connected: mockConnected.current,
    subscribe: mockSubscribe,
  }),
}));

const gpsFixture = {
  fix: '3d',
  latitude: -23.45,
  longitude: -46.78,
  altitude_m: 800,
  at: '2026-08-12T12:00:00Z',
  settings: { logging: true },
};

describe('useGpsCoords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnected.current = true;
    mockSubscribe.mockReturnValue(mockUnsub);
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when WebSocket is connected', () => {
    it('subscribes to the gps topic', () => {
      renderHook(() => useGpsCoords());
      expect(mockSubscribe).toHaveBeenCalledWith('gps', expect.any(Function));
    });

    it('updates position and fix on a self event', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const calls = mockSubscribe.mock.calls as Array<[string, (event: { data: unknown }) => void]>;
      const gpsCall = calls.find(([topic]) => topic === 'gps');
      expect(gpsCall).toBeDefined();
      const callback = gpsCall![1];

      act(() => {
        callback({ data: { change: 'self', gps: gpsFixture } });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual(gpsFixture);
        expect(result.current.fix).toBe('3d');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.lastUpdated).not.toBeNull();
    });

    it('ignores peers events', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const calls = mockSubscribe.mock.calls as Array<[string, (event: { data: unknown }) => void]>;
      const gpsCall = calls.find(([topic]) => topic === 'gps')!;
      const callback = gpsCall[1];

      act(() => {
        callback({ data: { change: 'peers', stations: [] } });
      });

      expect(result.current.position).toBeNull();
    });

    it('clears loading state after first position update', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const calls = mockSubscribe.mock.calls as Array<[string, (event: { data: unknown }) => void]>;
      const gpsCall = calls.find(([topic]) => topic === 'gps')!;
      const callback = gpsCall[1];

      act(() => {
        callback({
          data: {
            change: 'self',
            gps: { ...gpsFixture, latitude: null, longitude: null },
          },
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('when WebSocket is disconnected', () => {
    it('falls back to REST polling', async () => {
      mockConnected.current = false;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(gpsFixture),
      });
      globalThis.fetch = mockFetch;

      renderHook(() => useGpsCoords());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/gps');
      });
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from WebSocket on unmount', () => {
      const { unmount } = renderHook(() => useGpsCoords());
      unmount();
      expect(mockUnsub).toHaveBeenCalledTimes(1);
    });
  });
});