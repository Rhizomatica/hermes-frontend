'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Crosshair,
  FolderOpen,
  History,
  Loader2,
  LucideFileWarning,
  Moon,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { useTheme } from '@hermes/ui';
import type { Gps, GpsFixQuality, HermesUser } from '@hermes/api';
import { useRadioStatus } from '@/hooks/useRadioStatus';
import { useStationName } from '@/hooks/useStationName';
import GpsStatusBadge from '@/components/GpsStatusBadge';
import ShareLocationButton from '@/components/ShareLocationButton';
import BreadcrumbToggle from '@/components/BreadcrumbToggle';

export interface GpsSidePanelProps {
  /** Authenticated user for the identity header, or null while loading. */
  authUser: HermesUser | null;
  /** Current GPS state, owned by the page so the map can share it. */
  position: Gps | null;
  fix: GpsFixQuality | null;
  loading: boolean;
  stale: boolean;
  isCached: boolean;
  cacheAgeMs: number | null;
  onRefresh: () => void;
  /** Breadcrumb / trip view state. */
  showTrail: boolean;
  trailPointCount: number;
  viewingTrip: boolean;
  tripPointCount: number;
  onToggleTrail: () => void;
  onClearTrip: () => void;
  /** Control callbacks delegated to the page. */
  onRecenter: () => void;
  onOpenTrips: () => void;
  onOpenFiles: () => void;
}

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

/** Format a GPS fix timestamp to a compact HH:MM:SS string, or "—". */
function formatFixTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * GPS side panel — the compact control/status column shown to the left on
 * landscape and along the bottom on portrait.
 *
 * Owns panel-only concerns (radio telemetry, station callsign, clipboard
 * feedback, theme toggle) while receiving GPS and trail state from the page,
 * which shares that state with the map.
 */
export default function GpsSidePanel({
  authUser,
  position,
  fix,
  loading,
  stale,
  isCached,
  cacheAgeMs,
  onRefresh,
  showTrail,
  trailPointCount,
  viewingTrip,
  tripPointCount,
  onToggleTrail,
  onClearTrip,
  onRecenter,
  onOpenTrips,
  onOpenFiles,
}: GpsSidePanelProps) {
  const t = useTranslations('gps');
  const tc = useTranslations('common');
  const { theme, toggle: toggleTheme } = useTheme();
  const radio = useRadioStatus();
  const { callsign } = useStationName();

  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fixTime = position?.at ?? null;
  const radioSummary =
    radio && (radio.frequency != null || radio.mode != null || radio.tx != null || radio.power != null)
      ? [
          radio.tx != null ? (radio.tx ? t('radioTx') : t('radioRx')) : null,
          radio.frequency != null ? `${(radio.frequency / 1e6).toFixed(3)} MHz` : null,
          radio.mode != null ? radio.mode : null,
          radio.power != null ? `${radio.power}%` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

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

  return (
    <div className="relative z-10 flex flex-col gap-3 rounded-t-2xl border-gray-200 bg-background px-4 py-3 shadow-md dark:border-gray-700 landscape:w-72 landscape:shrink-0 landscape:rounded-t-none landscape:border-r landscape:justify-start landscape:order-first">
      {/* Minimal user info */}
      {authUser && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            {(authUser.display_name || authUser.username).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {authUser.display_name || authUser.username}
            </p>
            <p className="truncate text-xs text-foreground/60">
              {t('username')}: {authUser.username}
            </p>
            <p className="truncate text-xs text-foreground/60">
              {t('station')}: <span className="font-semibold uppercase">{callsign ?? '—'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Coordinates — compact, left-aligned */}
      <div className="flex items-start justify-between gap-3 landscape:flex-col">
        <div className="flex flex-wrap items-start gap-2">
          <button
            onClick={() =>
              position &&
              position.latitude != null &&
              handleCopy(position.latitude.toFixed(6), 'lat')
            }
            aria-label={t('copyLatitude')}
            className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ minHeight: '44px' }}
          >
            <span className="text-xs text-foreground/50">Lat</span>
            <span className="font-mono text-sm">
              {position?.latitude?.toFixed(6) ?? '—'}
            </span>
          </button>
          <button
            onClick={() =>
              position &&
              position.longitude != null &&
              handleCopy(position.longitude.toFixed(6), 'lon')
            }
            aria-label={t('copyLongitude')}
            className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ minHeight: '44px' }}
          >
            <span className="text-xs text-foreground/50">Lon</span>
            <span className="font-mono text-sm">
              {position?.longitude?.toFixed(6) ?? '—'}
            </span>
          </button>

          {/* Copied toast */}
          {copiedLabel && (
            <span
              className="self-center text-xs text-green-600 dark:text-green-400"
              role="status"
              aria-live="polite"
            >
              {t('copied', { label: copiedLabel === 'lat' ? 'Lat' : 'Lon' })}
            </span>
          )}

        </div>

      </div>

      {/* GPS status badges */}
      <div className="flex flex-col items-start gap-1">
        <GpsStatusBadge fix={fix} isStale={stale} logging={position?.settings?.logging} />
        {isCached && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200"
            role="status"
            title={t('lastKnownTooltip')}
          >
            <LucideFileWarning /> {t('lastKnown')}
            {cacheAgeMs != null && ` (${formatCacheAge(cacheAgeMs)})`}
          </span>
        )}
      </div>

      {/* Info strip: altitude, fix time, radio telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-foreground/50 landscape:flex-col landscape:items-start landscape:gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {t('altitude')}:{' '}
            {position?.altitude_m != null
              ? `${position.altitude_m.toFixed(0)}m`
              : '—'}
          </span>
          <span>·</span>
          <span>
            {t('fixTime')}: {formatFixTime(fixTime)}
          </span>
          {radioSummary && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1" title={t('radioStatus')}>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${radio?.tx ? 'bg-red-500' : 'bg-green-500'}`}
                  aria-hidden="true"
                />
                {radioSummary}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Control row: refresh, recenter, theme, trips, trail */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-2 dark:border-gray-700 landscape:flex-col landscape:items-stretch">
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label={t('refresh')}
          className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
          <span className="hidden landscape:inline text-sm">{t('refreshLabel')}</span>
        </button>

        <button
          onClick={onRecenter}
          disabled={!position}
          aria-label={t('recenter')}
          title={t('recenter')}
          className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <Crosshair className="h-5 w-5" />
          <span className="hidden landscape:inline text-sm">{t('recenterLabel')}</span>
        </button>

        <ShareLocationButton
          latitude={position?.latitude ?? null}
          longitude={position?.longitude ?? null}
        />

        <button
          onClick={toggleTheme}
          aria-label={tc('themeToggle')}
          title={tc('themeToggle')}
          className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="hidden landscape:inline text-sm">{tc('themeLabel')}</span>
        </button>

        <button
          onClick={onOpenTrips}
          aria-label={t('tripsOpen')}
          title={t('tripsOpen')}
          className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <History className="h-5 w-5" />
          <span className="hidden landscape:inline text-sm">{t('tripsLabel')}</span>
        </button>

        <button
          onClick={onOpenFiles}
          aria-label={t('gpsFilesOpen')}
          title={t('gpsFilesOpen')}
          className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <FolderOpen className="h-5 w-5" />
          <span className="hidden landscape:inline text-sm">{t('gpsFilesLabel')}</span>
        </button>

        {viewingTrip ? (
          <button
            onClick={onClearTrip}
            aria-label={t('clearTripView')}
            title={t('clearTripView')}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <History className="h-5 w-5" />
            <span className="hidden landscape:inline text-sm">{t('viewingTrip')}</span>
            <span className="text-xs opacity-70">({tripPointCount})</span>
          </button>
        ) : (
          <BreadcrumbToggle
            visible={showTrail}
            pointCount={trailPointCount}
            onToggle={onToggleTrail}
          />
        )}
      </div>
    </div>
  );
}
