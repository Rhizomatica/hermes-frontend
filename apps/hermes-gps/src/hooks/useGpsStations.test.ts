import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGpsStations } from './useGpsStations';
import type { GpsStation } from '@hermes/api';

const stationsFixture: GpsStation[] = [
  {
    uucp_name: 'PY2ABC',
    enabled: true,
    latitude: -23.51,
    longitude: -46.6,
    altitude_m: 780,
    position_at: '2026-08-12T12:00:00Z',
    position_source: 'gps',
  },
  {
    uucp_name: 'PY2JKL',
    enabled: true,
    latitude: null,
    longitude: null,
    altitude_m: null,
    position_at: null,
    position_source: null,
  },
];

function jsonResponse(data: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: () => Promise.resolve(data) };
}

describe('useGpsStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists stations on mount', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ data: stationsFixture }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useGpsStations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stations).toEqual(stationsFixture);
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors when the request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: 'daemon down' }, false, 503),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useGpsStations());

    await waitFor(() => {
      expect(result.current.error).toBe('daemon down');
    });
    expect(result.current.stations).toEqual([]);
  });
});
