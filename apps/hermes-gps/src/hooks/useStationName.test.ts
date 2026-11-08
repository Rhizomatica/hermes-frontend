import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStationName } from './useStationName';

function jsonResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) };
}

describe('useStationName', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the station callsign from the beacon', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ callsign: 'PU2UIT' }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useStationName());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.callsign).toBe('PU2UIT');
  });

  it('falls back to null when the callsign is empty', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ callsign: '   ' }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useStationName());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.callsign).toBeNull();
  });

  it('stays null when the beacon request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: 'unavailable' }, false),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useStationName());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.callsign).toBeNull();
  });
});