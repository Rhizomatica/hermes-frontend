'use client';

import { useTranslations } from 'next-intl';

export interface BreadcrumbToggleProps {
  /** Whether the breadcrumb trail is currently visible */
  visible: boolean;
  /** Number of points in the trail (for display) */
  pointCount: number;
  /** Toggle callback */
  onToggle: () => void;
}

/**
 * Toggle button for showing/hiding the GPS breadcrumb trail.
 *
 * Displays point count and an active/inactive indicator.
 * Minimum 44px touch target per design tokens.
 *
 * @example
 * <BreadcrumbToggle
 *   visible={showTrail}
 *   pointCount={history.length}
 *   onToggle={() => setShowTrail(v => !v)}
 * />
 */
export default function BreadcrumbToggle({
  visible,
  pointCount,
  onToggle,
}: BreadcrumbToggleProps) {
  const t = useTranslations('gps');

  return (
    <button
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? t('hideTrail') : t('showTrail')}
      className={`rounded-lg px-3 py-2 text-sm transition-colors ${
        visible
          ? 'bg-orange-500 text-white'
          : 'bg-gray-200 text-foreground hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
      }`}
      style={{ minHeight: '44px', minWidth: '44px' }}
    >
      {visible ? t('trailOn') : t('trailOff')}
      <span className="ml-1 text-xs opacity-70">({pointCount})</span>
    </button>
  );
}