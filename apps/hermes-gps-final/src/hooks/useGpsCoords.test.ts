import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGpsCoords } from './useGpsCoords';

// Mock @hermes/shared-auth WebSocket
const mockSubscribe = vi.fn();
const mockUnsub = vi.fn();

vi.mock('@hermes/shared-auth', () => ({
  useWebSocket: () => ({
    connected: true,
    subscribe: mockSubscribe,
  }),
}));

describe('useGpsCoords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(mockUnsub);
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when WebSocket is connected', () => {
    it('subscribes to gps.position and gps.fix events', () => {
      renderHook(() => useGpsCoords());

      expect(mockSubscribe).toHaveBeenCalledWith(
        'gps.position',
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        'gps.fix',
        expect.any(Function),
      );
    });

    it('updates position on gps.position event', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const positionCallback = mockSubscribe.mock.calls.find(
        (call: [string, (event: unknown) => void]) =>
          call[0] === 'gps.position',
      )[1];

      act(() => {
        positionCallback({
          payload: {
            latitude: -23.45,
            longitude: -46.78,
            altitude: 800,
            speed: 0,
            heading: 0,
            timestamp: '2026-08-12T12:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({
          latitude: -23.45,
          longitude: -46.78,
          altitude: 800,
          speed: 0,
          heading: 0,
          timestamp: '2026-08-12T12:00:00Z',
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.lastUpdated).not.toBeNull();
    });

    it('updates fix on gps.fix event', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const fixCallback = mockSubscribe.mock.calls.find(
        (call: [string, (event: unknown) => void]) => call[0] === 'gps.fix',
      )[1];

      act(() => {
        fixCallback({
          payload: { quality: 2, satellites: 8, hdop: 1.5 },
        });
      });

      await waitFor(() => {
        expect(result.current.fix).toEqual({
          quality: 2,
          satellites: 8,
          hdop: 1.5,
        });
      });
    });

    it('clears loading state after first position update', async () => {
      const { result } = renderHook(() => useGpsCoords());

      const positionCallback = mockSubscribe.mock.calls.find(
        (call: [string, (event: unknown) => void]) =>
          call[0] === 'gps.position',
      )[1];

      act(() => {
        positionCallback({
          payload: {
            latitude: 0,
            longitude: 0,
            altitude: null,
            speed: null,
            heading: null,
            timestamp: '2026-08-12T12:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('when WebSocket is disconnected', () => {
    beforeEach(() => {
      vi.doMock('@hermes/shared-auth', () => ({
        useWebSocket: () => ({
          connected: false,
          subscribe: mockSubscribe,
        }),
      }));
    });

    it('falls back to REST polling', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              latitude: 10,
              longitude: 20,
              altitude: null,
              speed: null,
              heading: null,
              timestamp: '2026-08-12T12:00:00Z',
            },
          }),
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
      expect(mockUnsub).toHaveBeenCalledTimes(2);
    });
  });
});