import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTrips } from './useTrips';
import type { Trip } from '@hermes/api';

const tripsFixture: Trip[] = [
  { id: 2, started_at: '2026-08-12T10:00:00Z', ended_at: null, point_count: 8 },
  { id: 1, started_at: '2026-08-11T10:00:00Z', ended_at: '2026-08-11T16:00:00Z', point_count: 5 },
];

const tripFixture: Trip = tripsFixture[0];

const pointsFixture = [
  { at: '2026-08-12T10:00:00Z', latitude: -23.5, longitude: -46.6 },
];

function jsonResponse(data: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: () => Promise.resolve(data) };
}

function installMockFetch() {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/trip/close')) {
      return jsonResponse({ ...tripFixture, ended_at: '2026-08-12T12:00:00Z' });
    }
    if (url.includes('/api/gps/trips/')) {
      return jsonResponse({ trip: tripFixture, data: pointsFixture });
    }
    return jsonResponse({ data: tripsFixture });
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('useTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists trips and identifies the current trip on mount', async () => {
    installMockFetch();

    const { result } = renderHook(() => useTrips());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trips).toEqual(tripsFixture);
    expect(result.current.currentTrip?.id).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('loads the breadcrumb points of a selected trip', async () => {
    installMockFetch();

    const { result } = renderHook(() => useTrips());
    await waitFor(() => expect(result.current.trips).toHaveLength(2));

    await act(async () => {
      await result.current.selectTrip(tripFixture);
    });

    expect(result.current.selectedTrip?.id).toBe(2);
    expect(result.current.points).toEqual(pointsFixture);
    expect(result.current.loadingPoints).toBe(false);
  });

  it('closes the current trip and refreshes the list', async () => {
    const fetchMock = installMockFetch();

    const { result } = renderHook(() => useTrips());
    await waitFor(() => expect(result.current.trips).toHaveLength(2));

    let closed = false;
    await act(async () => {
      closed = await result.current.closeCurrentTrip();
    });

    expect(closed).toBe(true);
    expect(result.current.closing).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gps/trip/close',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces errors when the list request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: 'daemon down' }, false, 503),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useTrips());

    await waitFor(() => {
      expect(result.current.error).toBe('daemon down');
    });
    expect(result.current.trips).toEqual([]);
  });
});