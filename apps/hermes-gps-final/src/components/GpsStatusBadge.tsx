'use client';

import { useTranslations } from 'next-intl';
import type { GpsFix, RadioStatus } from '@hermes/api';

export interface GpsStatusBadgeProps {
  /** GPS fix quality data from useGpsCoords (null = no data) */
  fix: GpsFix | null;
  /** Whether position data is stale (>60s without update) */
  isStale: boolean;
  /** Optional radio/transceiver status (power, frequency, last HAM sync) */
  radio?: RadioStatus | null;
}

/**
 * Renders GPS fix quality, satellite count, HDOP, and — when provided —
 * radio telemetry (power, operating frequency, last HAM sync) as compact
 * badges. All indicators use accessible tooltips/aria labels.
 *
 * Fix quality: No Fix = red, 2D = yellow, 3D = green.
 * Radio fields render "—" when unknown.
 *
 * @example
 * <GpsStatusBadge fix={fix} isStale={stale} radio={radio} />
 */
export default function GpsStatusBadge({ fix, isStale, radio }: GpsStatusBadgeProps) {
  const t = useTranslations('gps');

  if (!fix) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900 dark:text-red-200"
          role="status"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          {t('fixNoFix')}
        </span>
        <RadioBadges radio={radio} t={t} />
      </div>
    );
  }

  const fixQuality = getFixQuality(fix.quality);
  const fixLabel = getFixLabel(fix.quality);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" role="status" aria-label={t('gpsStatus')}>
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

      {/* Radio telemetry */}
      <RadioBadges radio={radio} t={t} />

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

/**
 * Renders radio power, frequency, and last HAM sync time as badges.
 * Gracefully renders "—" placeholders when values are absent.
 */
function RadioBadges({
  radio,
  t,
}: {
  radio: RadioStatus | null | undefined;
  t: ReturnType<typeof useTranslations<'gps'>>;
}) {
  const power = radio?.power ?? null;
  const frequency = radio?.frequency ?? null;
  const lastHamSync = radio?.lastHamSync ?? null;

  const powerOn = power?.toLowerCase() === 'on';

  return (
    <>
      {/* Radio power */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
          powerOn
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
            : power
              ? 'bg-gray-200 text-gray-600 dark:bg-orange-700 dark:text-gray-300'
              : 'bg-gray-100 text-foreground/40 dark:bg-orange-800'
        }`}
        title={t('radioPower')}
      >
        📻 {power ?? '—'}
      </span>

      {/* Frequency */}
      <span
        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900 dark:text-purple-200"
        title={t('frequency')}
      >
        {frequency != null ? `${(frequency / 1e6).toFixed(3)} MHz` : '— MHz'}
      </span>

      {/* Last HAM sync */}
      <span
        className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-teal-700 dark:bg-teal-900 dark:text-teal-200"
        title={t('lastHamSync')}
      >
        ⏱ HAM {formatSyncTime(lastHamSync)}
      </span>
    </>
  );
}

/** Format an ISO timestamp to a compact HH:MM:SS string, or "—". */
function formatSyncTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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