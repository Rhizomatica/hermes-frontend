import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStationInfo } from './useStationInfo';

function jsonResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) };
}

describe('useStationInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads station identity from /api/system', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        hostname: 'hermes',
        uucp_name: 'pu2uit-3',
        callsign: 'PU2UIT',
        domain: 'hermes.local',
        versions: { backend: '2.0.0', mercury: '1.0.0', os: 'bookworm' },
        uptime_s: 3725,
      }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useStationInfo());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stationName).toBe('pu2uit-3');
    expect(result.current.callsign).toBe('PU2UIT');
    expect(result.current.domain).toBe('hermes.local');
    expect(result.current.version).toBe('2.0.0');
    expect(result.current.uptime).toBe(3725);
  });

  it('falls back to null when the endpoint fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ type: 'problem' }, false),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useStationInfo());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stationName).toBeNull();
    expect(result.current.callsign).toBeNull();
    expect(result.current.domain).toBeNull();
    expect(result.current.version).toBeNull();
    expect(result.current.uptime).toBeNull();
  });
});
