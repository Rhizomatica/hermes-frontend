'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Share2 } from 'lucide-react';

export interface ShareLocationButtonProps {
  /** Current latitude in decimal degrees, or null when there is no fix. */
  latitude: number | null;
  /** Current longitude in decimal degrees, or null when there is no fix. */
  longitude: number | null;
}

/** OpenStreetMap link target for the shared position. */
function osmUrl(lat: string, lon: string): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/**
 * Shares the current GPS position using the Web Share API when available
 * (e.g. Android/companion devices). When there is no share sheet — the sBitx
 * kiosk, for example — it falls back to copying the coordinates and a map link
 * to the clipboard and shows a brief confirmation.
 *
 * @example
 * <ShareLocationButton
 *   latitude={position?.latitude ?? null}
 *   longitude={position?.longitude ?? null}
 * />
 */
export default function ShareLocationButton({
  latitude,
  longitude,
}: ShareLocationButtonProps) {
  const t = useTranslations('gps');
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disabled = latitude == null || longitude == null;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleShare() {
    if (latitude == null || longitude == null) return;

    const lat = latitude.toFixed(6);
    const lon = longitude.toFixed(6);
    const title = t('shareTitle');
    const text = t('shareText', { lat, lon });
    const url = osmUrl(lat, lon);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // The user dismissed the share sheet — don't fall back to copying.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Any other failure falls through to the clipboard fallback.
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${text}\n${url}`).catch(() => undefined);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={() => void handleShare()}
      disabled={disabled}
      aria-label={t('shareLocation')}
      title={t('shareLocation')}
      className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
    >
      {copied ? (
        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
      ) : (
        <Share2 className="h-5 w-5" />
      )}
      <span className="hidden landscape:inline text-sm">
        {copied ? t('shareCopied') : t('shareLabel')}
      </span>
    </button>
  );
}
