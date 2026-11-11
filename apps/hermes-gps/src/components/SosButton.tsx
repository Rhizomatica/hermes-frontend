'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Siren } from 'lucide-react';
import { ConfirmDialog } from '@hermes/ui';
import { useSosEmergency } from '@/hooks/useSosEmergency';

export interface SosButtonProps {
  /** Whether a GPS fix is available; sending is disabled without one. */
  hasPosition: boolean;
}

/**
 * Floating SOS emergency action, overlaid on the map.
 *
 * Owns the full SOS flow — the prominent button, the error feedback, and the
 * send/clear confirmation dialog — via `useSosEmergency()`. The only external
 * dependency is whether there is a position fix, which gates the send action.
 *
 * @example
 * <SosButton hasPosition={position != null} />
 */
export default function SosButton({ hasPosition }: SosButtonProps) {
  const t = useTranslations('gps');
  const tc = useTranslations('common');
  const sos = useSosEmergency();
  const [dialog, setDialog] = useState<'send' | 'clear' | null>(null);

  return (
    <>
      {/* SOS — prominent emergency action, separated from the panel */}
      <button
        onClick={() => setDialog(sos.emergency > 0 ? 'clear' : 'send')}
        disabled={sos.sending || sos.clearing || (sos.emergency === 0 && !hasPosition)}
        aria-label={sos.emergency > 0 ? t('sosActive') : t('sosButton')}
        title={sos.emergency > 0 ? t('sosActiveTooltip') : t('sosButtonTooltip')}
        className={
          sos.emergency > 0
            ? 'absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-700/40 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed'
            : 'absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed'
        }
        style={{ minHeight: '44px', minWidth: '44px' }}
      >
        {sos.sending || sos.clearing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Siren className="h-5 w-5" />
        )}
        <span className="hidden sm:inline">
          {sos.sending
            ? t('sosSending')
            : sos.emergency > 0
              ? t('sosActive')
              : t('sosButton')}
        </span>
      </button>

      {/* SOS error feedback */}
      {sos.error && (
        <div
          role="alert"
          className="absolute bottom-20 right-4 z-20 max-w-xs rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-900 dark:text-red-200"
        >
          {t('sosError', { message: sos.error })}
        </div>
      )}

      {/* SOS confirm dialog (send or clear) */}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'clear' ? t('sosClearConfirmTitle') : t('sosConfirmTitle')}
        message={dialog === 'clear' ? t('sosClearConfirmMessage') : t('sosConfirmMessage')}
        confirmLabel={dialog === 'clear' ? t('sosClear') : tc('send')}
        cancelLabel={tc('cancel')}
        onConfirm={() => {
          const action = dialog;
          setDialog(null);
          if (action === 'clear') void sos.clearSos();
          else void sos.sendSos(1);
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
