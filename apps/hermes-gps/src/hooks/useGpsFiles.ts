'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GpsFile } from '@hermes/api';

/**
 * ServerState<T> for the station's recorded GPS position files.
 *
 * Backs the GPS files panel: lists the recorded position files
 * (`GET /api/gps/files`), downloads one (`GET /api/gps/files/{name}`) and
 * deletes them all (`DELETE /api/gps/files`). Requests proxy the
 * hermes-radio-daemon `/api/v2/gps/files*` endpoints through the app's
 * `/api/gps/files*` routes.
 */
export interface GpsFilesState {
  /** Recorded position files, newest first. */
  files: GpsFile[];
  /** Initial list fetch in flight. */
  loading: boolean;
  /** A deleteAll request is in flight. */
  deleting: boolean;
  /** The name of the file currently being downloaded, or null. */
  downloading: string | null;
  /** Last failure message, or null. */
  error: string | null;
  /** Reload the list of files. */
  refresh: () => Promise<void>;
  /** Delete every recorded file. Resolves to success. */
  deleteAll: () => Promise<boolean>;
  /** Download a recorded file to the browser. Resolves to success. */
  download: (name: string) => Promise<boolean>;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function messageFrom(data: unknown, fallback: string): string {
  const err = (data ?? {}) as { message?: string; detail?: string };
  return err.detail ?? err.message ?? fallback;
}

/**
 * Hook to list, download and delete the station's recorded GPS files.
 *
 * @example
 * const files = useGpsFiles();
 * await files.download(files.files[0].name);
 */
export function useGpsFiles(): GpsFilesState {
  const [files, setFiles] = useState<GpsFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state (re-asserted on mount to survive StrictMode remounts).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = 'gpsFiles';
    const existing = inFlightRequests.get(cacheKey);
    const promise =
      existing ??
      fetch('/api/gps/files').then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(messageFrom(data, 'Failed to fetch GPS files'));
        const list = (data as { data?: GpsFile[] }).data;
        return Array.isArray(list) ? list : [];
      });
    if (!existing) inFlightRequests.set(cacheKey, promise);

    try {
      const result = (await promise) as GpsFile[];
      if (mountedRef.current) {
        setFiles(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch GPS files');
      }
    } finally {
      inFlightRequests.delete(cacheKey);
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const deleteAll = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/gps/files', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (mountedRef.current) {
          setError(messageFrom(data, 'Failed to delete GPS files'));
        }
        return false;
      }
      if (mountedRef.current) setFiles([]);
      await refresh();
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete GPS files');
      }
      return false;
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }, [refresh]);

  const download = useCallback(async (name: string) => {
    setDownloading(name);
    setError(null);
    try {
      const res = await fetch(`/api/gps/files/${encodeURIComponent(name)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (mountedRef.current) setError(messageFrom(data, 'Failed to download file'));
        return false;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to download file');
      }
      return false;
    } finally {
      if (mountedRef.current) setDownloading(null);
    }
  }, []);

  // Initial load (deferred to avoid a synchronous setState in the effect body).
  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { files, loading, deleting, downloading, error, refresh, deleteAll, download };
}
