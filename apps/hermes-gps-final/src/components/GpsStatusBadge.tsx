'use client';

import { useTranslations } from 'next-intl';
import type { GpsFixQuality } from '@hermes/api';

export interface GpsStatusBadgeProps {
  /** GPS fix quality from useGpsCoords (null = no fix). */
  fix: GpsFixQuality | null;
  /** Whether position data is stale (>60s without update) */
  isStale: boolean;
  /** Whether GPS position logging is enabled (Gps.settings.logging). */
  logging?: boolean | null;
}

/**
 * Renders GPS-derived status as compact badges: fix quality, whether position
 * logging is on/off, and a stale-data indicator. All indicators use accessible
 * labels.
 *
 * Fix quality: No Fix = red, 2D = yellow, 3D = green.
 *
 * @example
 * <GpsStatusBadge fix={fix} isStale={stale} logging={position?.settings?.logging} />
 */
export default function GpsStatusBadge({ fix, isStale, logging }: GpsStatusBadgeProps) {
  const t = useTranslations('gps');

  const quality = fix ?? 'none';
  const style = getFixStyle(quality);
  const label = getFixLabel(quality);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" role="status" aria-label={t('gpsStatus')}>
      {/* Fix quality badge */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${style.bg}`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
        {t(label)}
      </span>

      {/* Logging badge */}
      {logging != null && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
            logging
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}
          role="status"
        >
          {t(logging ? 'loggingOn' : 'loggingOff')}
        </span>
      )}

      {/* Stale indicator */}
      {isStale && (
        <span
          className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
          role="status"
        >
          {t('staleData')}
        </span>
      )}
    </div>
  );
}

interface FixStyle {
  bg: string;
  dot: string;
}

function getFixStyle(quality: GpsFixQuality): FixStyle {
  if (quality === 'none') {
    return {
      bg: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
      dot: 'bg-red-500',
    };
  }
  if (quality === '2d') {
    return {
      bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      dot: 'bg-yellow-500',
    };
  }
  return {
    bg: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    dot: 'bg-green-500',
  };
}

function getFixLabel(quality: GpsFixQuality): string {
  if (quality === 'none') return 'fixNoFix';
  if (quality === '2d') return 'fix2D';
  return 'fix3D';
}