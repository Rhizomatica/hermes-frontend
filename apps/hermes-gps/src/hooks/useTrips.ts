'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GpsPoint, Trip, TripPoints, TripsResponse } from '@hermes/api';

/**
 * ServerState<T> for the station's recorded GPS trips.
 *
 * Backs the trips panel: lists recorded trips (newest first), loads the
 * breadcrumb of a selected trip, and closes the open trip. All requests proxy
 * the hermes-radio-daemon `/api/v2/gps/trips*` endpoints through the app's
 * `/api/gps/*` routes.
 */
export interface TripsState {
  /** Recorded trips, newest first. */
  trips: Trip[];
  /** Pagination cursor for the next page, or null when there are no more. */
  nextCursor: string | null;
  /** The open trip (ended_at is null), or null when none is listed. */
  currentTrip: Trip | null;
  /** The trip the user last selected, or null. */
  selectedTrip: Trip | null;
  /** Breadcrumb points of {@link selectedTrip}, oldest first. */
  points: GpsPoint[];
  /** Initial list fetch in flight. */
  loading: boolean;
  /** Loading the selected trip's breadcrumb points. */
  loadingPoints: boolean;
  /** Loading the next page of trips. */
  loadingMore: boolean;
  /** Last failure message, or null. */
  error: string | null;
  /** A closeCurrentTrip request is in flight. */
  closing: boolean;
  /** Reload the first page of trips. */
  refresh: () => Promise<void>;
  /** Load the next page of trips, when `nextCursor` is set. */
  loadMore: () => Promise<void>;
  /** Load a trip's breadcrumb points into `points` and resolve to them. */
  selectTrip: (trip: Trip) => Promise<GpsPoint[]>;
  /** Close the open trip. Resolves to success. */
  closeCurrentTrip: () => Promise<boolean>;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function messageFrom(data: unknown, fallback: string): string {
  const err = (data ?? {}) as { message?: string; detail?: string };
  return err.detail ?? err.message ?? fallback;
}

/**
 * Hook to list, inspect, and close the station's recorded GPS trips.
 *
 * @example
 * const trips = useTrips();
 * await trips.selectTrip(trips.trips[0]);
 * <MapView breadcrumb={trips.points} showBreadcrumb />
 */
export function useTrips(): TripsState {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const mountedRef = useRef(true);

  // Track mounted state (re-asserted on mount to survive StrictMode remounts).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null, reset: boolean) => {
      const cacheKey = cursor ?? 'trips:first';
      const url = cursor
        ? `/api/gps/trips?cursor=${encodeURIComponent(cursor)}`
        : '/api/gps/trips';

      const existing = inFlightRequests.get(cacheKey);
      if (existing) {
        const cached = (await existing) as TripsResponse;
        if (mountedRef.current) {
          setTrips((prev) => (reset ? cached.data : [...prev, ...cached.data]));
          setNextCursor(cached.next_cursor ?? null);
        }
        return;
      }

      const promise = fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(messageFrom(err, 'Failed to fetch trips'));
          }
          return (await res.json()) as TripsResponse;
        })
        .catch((err) => {
          if (mountedRef.current) {
            setError(err instanceof Error ? err.message : 'Failed to fetch trips');
          }
          throw err;
        });

      inFlightRequests.set(cacheKey, promise);
      try {
        const result = await promise;
        if (mountedRef.current) {
          setTrips((prev) => (reset ? result.data : [...prev, ...result.data]));
          setNextCursor(result.next_cursor ?? null);
          setError(null);
        }
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(null, true);
    } catch {
      // Error already surfaced via fetchPage.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextCursor, false);
    } catch {
      // Error already surfaced via fetchPage.
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  const selectTrip = useCallback(async (trip: Trip): Promise<GpsPoint[]> => {
    setSelectedTrip(trip);
    setLoadingPoints(true);
    setError(null);
    try {
      const res = await fetch(`/api/gps/trips/${trip.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(messageFrom(err, 'Failed to fetch trip'));
      }
      const result = (await res.json()) as TripPoints;
      const next = Array.isArray(result.data) ? result.data : [];
      if (mountedRef.current) {
        setPoints(next);
      }
      return next;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trip');
      }
      return [];
    } finally {
      if (mountedRef.current) setLoadingPoints(false);
    }
  }, []);

  const closeCurrentTrip = useCallback(async () => {
    setClosing(true);
    setError(null);
    try {
      const res = await fetch('/api/gps/trip/close', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (mountedRef.current) {
          setError(messageFrom(data, 'Failed to close trip'));
        }
        return false;
      }
      if (mountedRef.current) {
        setSelectedTrip(null);
        setPoints([]);
      }
      await refresh();
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to close trip');
      }
      return false;
    } finally {
      if (mountedRef.current) setClosing(false);
    }
  }, [refresh]);

  // Initial load (deferred to avoid a synchronous setState in the effect body).
  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const currentTrip = trips.find((trip) => trip.ended_at == null) ?? null;

  return {
    trips,
    nextCursor,
    currentTrip,
    selectedTrip,
    points,
    loading,
    loadingPoints,
    loadingMore,
    error,
    closing,
    refresh,
    loadMore,
    selectTrip,
    closeCurrentTrip,
  };
}
