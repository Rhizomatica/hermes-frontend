'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from '@hermes/ui';
import { useLocale } from '@hermes/shared-auth';
import type { GpsPosition } from '@hermes/api';

export interface CoordinatePanelProps {
  /** Current GPS position or null if no data */
  position: GpsPosition | null;
  /** Whether data is stale (>60s without update) */
  isStale: boolean;
  /** Last updated timestamp */
  lastUpdated: Date | null;
  /** Manual refresh callback */
  onRefresh: () => void;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * Bottom panel overlay displaying GPS coordinates, timestamp,
 * theme/locale toggles, and manual refresh.
 *
 * @example
 * <CoordinatePanel
 *   position={position}
 *   isStale={stale}
 *   lastUpdated={lastUpdated}
 *   onRefresh={refresh}
 *   isLoading={loading}
 * />
 */
export default function CoordinatePanel({
  position,
  isStale,
  lastUpdated,
  onRefresh,
  isLoading,
}: CoordinatePanelProps) {
  const t = useTranslations('gps');
  const tc = useTranslations('common');
  const { theme, toggle: toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  const nextLocale = locale === 'en' ? 'pt' : 'en';

  function formatCoord(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toFixed(6);
  }

  function toDMS(value: number | null | undefined): string {
    if (value == null) return '—';
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
    const dir = value >= 0 ? '' : '';
    return `${deg}°${min}'${sec}"${dir}`;
  }

  function formatTime(date: Date | null): string {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return date.toLocaleTimeString();
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Brief visual feedback could go here
    } catch {
      // Clipboard API not available
    }
  }

  if (!position) {
    return (
      <div className="rounded-t-2xl bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleTheme}
            aria-label={tc('themeToggle')}
            className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setLocale(nextLocale)}
            aria-label={tc('localeToggle')}
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ minHeight: '44px' }}
          >
            {nextLocale.toUpperCase()}
          </button>
        </div>
        <p className="mt-2 text-center text-base text-foreground/60">
          {t('noPosition')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-t-2xl bg-background p-4 shadow-lg">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleTheme}
          aria-label={tc('themeToggle')}
          className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(nextLocale)}
            aria-label={tc('localeToggle')}
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ minHeight: '44px' }}
          >
            {nextLocale.toUpperCase()}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            aria-label={t('refresh')}
            className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Coordinates */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <button
          onClick={() => handleCopy(formatCoord(position.latitude))}
          aria-label="Copy latitude"
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ minHeight: '44px' }}
        >
          <span className="text-xs text-foreground/50">Lat</span>
          <br />
          <span className="font-mono text-lg">{formatCoord(position.latitude)}</span>
        </button>
        <button
          onClick={() => handleCopy(formatCoord(position.longitude))}
          aria-label="Copy longitude"
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ minHeight: '44px' }}
        >
          <span className="text-xs text-foreground/50">Lon</span>
          <br />
          <span className="font-mono text-lg">{formatCoord(position.longitude)}</span>
        </button>
      </div>

      {/* Timestamp + stale badge */}
      <div className="mt-2 flex items-center justify-center gap-2 text-sm text-foreground/50">
        <span>{t('lastUpdated')}</span>
        <span>{formatTime(lastUpdated)}</span>
        {isStale && (
          <span
            className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900 dark:text-orange-200"
            role="status"
          >
            {t('staleData')}
          </span>
        )}
      </div>
    </div>
  );
}