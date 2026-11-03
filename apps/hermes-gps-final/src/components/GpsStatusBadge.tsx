'use client';

import { useTranslations } from 'next-intl';
import type { GpsFixQuality, RadioStatus } from '@hermes/api';
import { RadioTower, Clock } from 'lucide-react';

export interface GpsStatusBadgeProps {
  /** GPS fix quality from useGpsCoords (null = no fix). */
  fix: GpsFixQuality | null;
  /** Whether position data is stale (>60s without update) */
  isStale: boolean;
  /** Optional radio/transceiver status (operating frequency) */
  radio?: RadioStatus | null;
}

/**
 * Renders GPS fix quality and — when provided — radio telemetry (operating
 * frequency) as compact badges. All indicators use accessible tooltips/aria
 * labels.
 *
 * Fix quality: No Fix = red, 2D = yellow, 3D = green.
 * Radio fields render "—" when unknown.
 *
 * @example
 * <GpsStatusBadge fix={fix} isStale={stale} radio={radio} />
 */
export default function GpsStatusBadge({ fix, isStale, radio }: GpsStatusBadgeProps) {
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
        className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-orange-200 text-orange-700  dark:bg-orange-700 dark:text-orange-200'
        title={t('radioPower')}
      >
        <RadioTower className="h-4 w-4" aria-hidden="true" /> {power ?? '—'}
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
        <Clock className="h-4 w-4" aria-hidden="true" /> HAM {formatSyncTime(lastHamSync)}
      </span>
    </>
  );
}

/** Format an ISO timestamp to a compact HH:MM string, or "—". */
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