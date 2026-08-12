'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthGuard } from '@hermes/shared-auth';
import { useTheme } from '@hermes/ui';
import { ErrorBanner, LoadingSpinner } from '@hermes/ui';
import { useGpsCoords } from '@/hooks/useGpsCoords';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import GpsStatusBadge from '@/components/GpsStatusBadge';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const BreadcrumbToggle = dynamic(
  () => import('@/components/BreadcrumbToggle'),
  { ssr: false },
);

/**
 * Format a cache age in milliseconds to a human-readable string.
 * E.g. 65_000 → "1m", 3_600_000 → "1h", 86_400_000 → "1d"
 */
function formatCacheAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * GPS main page — full-screen map with coordinate overlay panel,
 * breadcrumb toggle, GPS status indicators, offline cache badge,
 * and copy-to-clipboard with toast feedback.
 *
 * Composes MapView, GpsStatusBadge, BreadcrumbToggle, and controls.
 * Auth-aware via useAuthGuard. Uses useGpsCoords for real-time
 * position data and useGpsHistory for breadcrumb trail.
 *
 * @example
 * // Rendered at /gps in co-deployed mode
 * <GpsPage />
 */
export default function GpsPage() {
  const t = useTranslations('gps');
  const tc = useTranslations('common');
  const user = useAuthGuard();
  const { theme } = useTheme();
  const { position, fix, loading, error, lastUpdated, stale, isCached, cacheAgeMs, refresh } =
    useGpsCoords();
  const { history, appendPosition } = useGpsHistory();

  const [showTrail, setShowTrail] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Append new live positions to the breadcrumb history
  const prevTimestampRef = useRef<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (position && position.timestamp !== prevTimestampRef.current) {
      prevTimestampRef.current = position.timestamp;
      appendPosition(position);
    }
  }, [position, appendPosition]);

  // Copy coordinate to clipboard with 2s toast feedback
  function handleCopy(value: string, label: string) {
    navigator.clipboard.writeText(value).catch(() => {
      // Clipboard API not available — silently skip
    });
    setCopiedLabel(label);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedLabel(null);
    }, 2000);
  }

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Map fills remaining space */}
      <div className="absolute inset-0">
        <MapView
          latitude={position?.latitude ?? null}
          longitude={position?.longitude ?? null}
          isDark={theme === 'dark'}
          breadcrumb={history}
          showBreadcrumb={showTrail}
        />
      </div>

      {/* Back link overlay */}
      <a
        href="/"
        className="absolute left-4 top-4 z-10 rounded-lg bg-background/80 px-3 py-2 text-sm text-blue-500 backdrop-blur-sm"
        aria-label={tc('backToHermes')}
        style={{ minHeight: '44px', lineHeight: '44px' }}
      >
        {tc('backToHermes')}
      </a>

      {/* Error banner */}
      {error && (
        <div className="absolute left-4 right-4 top-16 z-10">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Bottom panel */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center justify-between rounded-t-2xl bg-background px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              aria-label={t('refresh')}
              className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {loading ? '⏳' : '🔄'}
            </button>

            <BreadcrumbToggle
              visible={showTrail}
              pointCount={history.length}
              onToggle={() => setShowTrail((v) => !v)}
            />
          </div>
        </div>

        {!position ? (
          <div className="bg-background px-4 pb-4 text-center text-base text-foreground/60">
            {loading ? t('loading') : t('noPosition')}
          </div>
        ) : (
          <div className="bg-background px-4 pb-4">
            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                onClick={() =>
                  handleCopy(position.latitude.toFixed(6), 'lat')
                }
                aria-label={t('copyLatitude')}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ minHeight: '44px' }}
              >
                <span className="text-xs text-foreground/50">Lat</span>
                <br />
                <span className="font-mono text-lg">
                  {position.latitude.toFixed(6)}
                </span>
              </button>
              <button
                onClick={() =>
                  handleCopy(position.longitude.toFixed(6), 'lon')
                }
                aria-label={t('copyLongitude')}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ minHeight: '44px' }}
              >
                <span className="text-xs text-foreground/50">Lon</span>
                <br />
                <span className="font-mono text-lg">
                  {position.longitude.toFixed(6)}
                </span>
              </button>
            </div>

            {/* Copied toast */}
            {copiedLabel && (
              <div
                className="mt-1 text-center text-xs text-green-600 dark:text-green-400"
                role="status"
                aria-live="polite"
              >
                {t('copied', { label: copiedLabel === 'lat' ? 'Lat' : 'Lon' })}
              </div>
            )}

            {/* GPS Status badges */}
            <div className="mt-2 flex flex-col items-center gap-1">
              <GpsStatusBadge fix={fix} isStale={stale} />
              {isCached && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  role="status"
                  title={t('lastKnownTooltip')}
                >
                  ⚠ {t('lastKnown')}
                  {cacheAgeMs != null && ` (${formatCacheAge(cacheAgeMs)})`}
                </span>
              )}
            </div>

            {/* Info row */}
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-foreground/50">
              <span>
                {t('altitude')}:{' '}
                {position.altitude != null
                  ? `${position.altitude.toFixed(0)}m`
                  : '—'}
              </span>
              <span>·</span>
              <span>
                {t('speed')}:{' '}
                {position.speed != null
                  ? `${position.speed.toFixed(1)}km/h`
                  : '—'}
              </span>
            </div>

            {/* Timestamp */}
            <div className="mt-1 text-center text-xs text-foreground/40">
              {t('lastUpdated')}:{' '}
              {lastUpdated
                ? new Intl.DateTimeFormat('en', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(lastUpdated)
                : '—'}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}