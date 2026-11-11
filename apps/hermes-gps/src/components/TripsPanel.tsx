'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GpsPoint, HermesRole, Trip } from '@hermes/api';
import { useTrips } from '@/hooks/useTrips';
import { ConfirmDialog, ErrorBanner, LoadingSpinner } from '@hermes/ui';
import { ChevronRight, Clock, Loader2, MapPin, X } from 'lucide-react';

export interface TripsPanelProps {
  /** Close the panel. */
  onClose: () => void;
  /** Send a trip's breadcrumb points to the map. */
  onViewTrip: (points: GpsPoint[]) => void;
  /** Called after the current trip has been closed. */
  onTripClosed: () => void;
  /** The authenticated user's role, for gating the close-trip action. */
  role: HermesRole | undefined;
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
}

/**
 * Slide-over panel listing the station's recorded GPS trips. Selecting a trip
 * shows its breadcrumb on the map; operators can close the open trip.
 *
 * @example
 * <TripsPanel
 *   onClose={close}
 *   onViewTrip={(points) => setTrail(points)}
 *   onTripClosed={refreshHistory}
 *   role={user.role}
 * />
 */
export default function TripsPanel({
  onClose,
  onViewTrip,
  onTripClosed,
  role,
}: TripsPanelProps) {
  const t = useTranslations('gps');
  const trips = useTrips();
  const [confirmClose, setConfirmClose] = useState(false);

  const canClose = role === 'operator' || role === 'admin';

  async function handleSelect(trip: Trip) {
    const points = await trips.selectTrip(trip);
    onViewTrip(points);
  }

  async function handleCloseCurrent() {
    setConfirmClose(false);
    const closed = await trips.closeCurrentTrip();
    if (closed) onTripClosed();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t('tripsTitle')}>
      <button
        type="button"
        aria-label={t('tripsClose')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-bold">{t('tripsTitle')}</h2>
          <button
            onClick={onClose}
            aria-label={t('tripsClose')}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {canClose && trips.currentTrip && (
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              onClick={() => setConfirmClose(true)}
              disabled={trips.closing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {trips.closing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              {t('tripsCloseCurrent')}
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {trips.loading ? (
            <LoadingSpinner label={t('tripsLoading')} />
          ) : trips.error && trips.trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3">
              <ErrorBanner message={trips.error} />
              <button
                onClick={() => void trips.refresh()}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium dark:bg-gray-700"
              >
                {t('tripsRetry')}
              </button>
            </div>
          ) : trips.trips.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground/60">{t('tripsEmpty')}</p>
          ) : (
            <>
              {trips.error && (
                <div className="mb-2">
                  <ErrorBanner message={trips.error} />
                </div>
              )}
              <ul className="flex flex-col gap-2">
              {trips.trips.map((trip) => {
                const isCurrent = trip.ended_at == null;
                const isSelected = trips.selectedTrip?.id === trip.id;
                return (
                  <li key={trip.id}>
                    <button
                      onClick={() => void handleSelect(trip)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                          : 'border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {trip.name}
                          </span>
                          <span className="block truncate text-xs text-foreground/60">
                            {formatWhen(trip.started_at)}
                            {' · '}
                            {isCurrent
                              ? t('tripsInProgress')
                              : t('tripsEnded', { date: formatWhen(trip.ended_at ?? '') })}
                            {' · '}
                            {t('tripsPointCount', { count: trip.point_count ?? 0 })}
                          </span>
                        </span>
                      </span>
                      {trips.loadingPoints && isSelected ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
                      )}
                    </button>
                  </li>
                );
              })}
              </ul>
            </>
          )}

          {trips.nextCursor && (
            <button
              onClick={() => void trips.loadMore()}
              disabled={trips.loadingMore}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:bg-gray-700"
            >
              {trips.loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('tripsLoadMore')}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title={t('tripsCloseCurrentTitle')}
        message={t('tripsCloseCurrentMessage')}
        confirmLabel={t('tripsCloseCurrentAction')}
        cancelLabel={t('tripsCancel')}
        onConfirm={() => void handleCloseCurrent()}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}