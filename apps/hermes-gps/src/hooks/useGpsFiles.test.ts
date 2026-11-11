import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGpsFiles } from './useGpsFiles';
import type { GpsFile } from '@hermes/api';

const filesFixture: GpsFile[] = [
  { name: 'positions-20260812.gpx', size_bytes: 12400, created_at: '2026-08-12T10:00:00Z' },
  { name: 'positions-20260811.gpx', size_bytes: 9000, created_at: '2026-08-11T10:00:00Z' },
];

function jsonResponse(data: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: () => Promise.resolve(data) };
}

describe('useGpsFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists recorded files on mount', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ data: filesFixture }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useGpsFiles());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.files).toEqual(filesFixture);
    expect(result.current.error).toBeNull();
  });

  it('deletes all files and refreshes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return jsonResponse(null, true, 204);
      }
      return jsonResponse({ data: filesFixture });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useGpsFiles());
    await waitFor(() => expect(result.current.files).toHaveLength(2));

    let deleted = false;
    await act(async () => {
      deleted = await result.current.deleteAll();
    });

    expect(deleted).toBe(true);
    expect(result.current.deleting).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gps/files',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces errors when the list request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: 'daemon down' }, false, 503),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useGpsFiles());

    await waitFor(() => {
      expect(result.current.error).toBe('daemon down');
    });
    expect(result.current.files).toEqual([]);
  });
});
