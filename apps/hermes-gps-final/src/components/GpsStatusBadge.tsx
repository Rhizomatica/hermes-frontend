'use client';

import { useTranslations } from 'next-intl';
import type { GpsFix } from '@hermes/api';

export interface GpsStatusBadgeProps {
  /** GPS fix quality data from useGpsCoords (null = no data) */
  fix: GpsFix | null;
  /** Whether position data is stale (>60s without update) */
  isStale: boolean;
}

/**
 * Renders GPS fix quality, satellite count, and HDOP indicators
 * with real-time data from the gps.fix WebSocket event.
 *
 * Fix quality: No Fix = red, 2D = yellow, 3D = green.
 * Satellite count and HDOP shown with accessible tooltips.
 *
 * @example
 * <GpsStatusBadge fix={fix} isStale={stale} />
 */
export default function GpsStatusBadge({ fix, isStale }: GpsStatusBadgeProps) {
  const t = useTranslations('gps');

  if (!fix) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900 dark:text-red-200"
          role="status"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          {t('fixNoFix')}
        </span>
        <span className="text-foreground/40">—</span>
      </div>
    );
  }

  const fixQuality = getFixQuality(fix.quality);
  const fixLabel = getFixLabel(fix.quality);

  return (
    <div className="flex items-center gap-2 text-xs" role="status" aria-label={t('gpsStatus')}>
      {/* Fix quality badge */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${fixQuality.bg}`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${fixQuality.dot}`}
          aria-hidden="true"
        />
        {t(fixLabel)}
      </span>

      {/* Satellites */}
      <span
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
        title={t('satellitesTooltip', { count: fix.satellites })}
        aria-label={t('satellitesAria', { count: fix.satellites })}
      >
        🛰 {fix.satellites}
      </span>

      {/* HDOP */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${getHdopStyle(fix.hdop)}`}
        title={t('hdopTooltip', { value: fix.hdop.toFixed(1) })}
        aria-label={t('hdopAria', { value: fix.hdop.toFixed(1) })}
      >
        HDOP {fix.hdop.toFixed(1)}
      </span>

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

function getFixQuality(quality: number): FixStyle {
  if (quality <= 0) {
    return {
      bg: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
      dot: 'bg-red-500',
    };
  }
  if (quality === 1) {
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

function getFixLabel(quality: number): string {
  if (quality <= 0) return 'fixNoFix';
  if (quality === 1) return 'fix2D';
  return 'fix3D';
}

function getHdopStyle(hdop: number): string {
  if (hdop <= 1.0) {
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
  }
  if (hdop <= 2.0) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
  }
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
}