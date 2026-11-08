'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GpsSettings, HermesRole } from '@hermes/api';
import { ConfirmDialog, ErrorBanner, LoadingSpinner } from '@hermes/ui';
import {
  Clock,
  Download,
  FileText,
  Loader2,
  Mail,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useGpsFiles } from '@/hooks/useGpsFiles';

export interface GpsFilesPanelProps {
  /** Close the panel. */
  onClose: () => void;
  /** Current GPS logging settings (Gps.settings) for the config badge. */
  settings: GpsSettings | null | undefined;
  /** The authenticated user's role, for gating the delete-all action. */
  role: HermesRole | undefined;
}

const fileDate = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Format a period in seconds to a compact "1h"/"30m"/"45s" string. */
function formatPeriod(seconds: number | undefined): string {
  if (seconds == null) return '—';
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Slide-over panel listing the station's recorded GPS position files with a
 * read-only badge of the GPS recording configuration. Files can be downloaded
 * individually or (operators) deleted all at once.
 *
 * The per-file "Transmit" button is intentionally disabled until the daemon
 * ships a `POST /api/v2/gps/files/{name}/send` endpoint.
 *
 * @example
 * <GpsFilesPanel onClose={close} settings={position?.settings} role={user.role} />
 */
export default function GpsFilesPanel({ onClose, settings, role }: GpsFilesPanelProps) {
  const t = useTranslations('gps');
  const files = useGpsFiles();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = role === 'operator' || role === 'admin';

  async function handleDeleteAll() {
    setConfirmDelete(false);
    await files.deleteAll();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('gpsFilesTitle')}
    >
      <button
        type="button"
        aria-label={t('gpsFilesClose')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-bold">{t('gpsFilesTitle')}</h2>
          <button
            onClick={onClose}
            aria-label={t('gpsFilesClose')}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {/* Recording configuration badge */}
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            <SlidersHorizontal className="h-4 w-4" />
            {t('gpsFilesConfigTitle')}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-foreground/60">{t('gpsFilesLogging')}</dt>
            <dd>
              {settings?.logging != null
                ? t(settings.logging ? 'loggingOn' : 'loggingOff')
                : '—'}
            </dd>

            <dt className="text-foreground/60">{t('gpsFilesSampleInterval')}</dt>
            <dd>{settings?.sample_interval_s != null ? `${settings.sample_interval_s}s` : '—'}</dd>

            <dt className="text-foreground/60">{t('gpsFilesPeriod')}</dt>
            <dd>{formatPeriod(settings?.file_period_s)}</dd>

            <dt className="col-span-2 text-foreground/60">{t('gpsFilesEmail')}</dt>
            <dd className="col-span-2 flex items-center gap-1 break-all">
              <Mail className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
              {settings?.email ? settings.email : t('gpsFilesEmailNone')}
            </dd>
          </dl>
        </div>
        {/* File list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {files.loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner label={t('gpsFilesLoading')} />
            </div>
          ) : files.error && files.files.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ErrorBanner message={files.error} />
              <button
                onClick={() => void files.refresh()}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium dark:bg-gray-700"
              >
                {t('gpsFilesRetry')}
              </button>
            </div>
          ) : files.files.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground/60">{t('gpsFilesEmpty')}</p>
          ) : (
            <>
              {files.error && (
                <div className="mb-2">
                  <ErrorBanner message={files.error} />
                </div>
              )}
              <ul className="flex flex-col gap-2">
                {files.files.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-orange-500" />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm">{file.name}</span>
                        <span className="flex items-center gap-1 text-xs text-foreground/60">
                          <Clock className="h-3 w-3" />
                          {fileDate.format(new Date(file.created_at))}
                          {' · '}
                          {formatSize(file.size_bytes)}
                        </span>
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => void files.download(file.name)}
                        disabled={files.downloading === file.name}
                        aria-label={t('gpsFilesDownload')}
                        title={t('gpsFilesDownload')}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {files.downloading === file.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>

                      {/* Stub: wire to POST /api/v2/gps/files/{name}/send when it lands. */}
                      <button
                        disabled
                        aria-label={t('gpsFilesTransmit')}
                        title={t('gpsFilesTransmitDisabled')}
                        className="rounded-lg p-2 text-gray-400 disabled:opacity-50 dark:text-gray-500"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {/* Delete all (operator/admin) */}
        {canDelete && files.files.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={files.deleting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {files.deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('gpsFilesDeleteAll')}
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t('gpsFilesDeleteAllTitle')}
        message={t('gpsFilesDeleteAllMessage')}
        confirmLabel={t('gpsFilesDeleteAllAction')}
        cancelLabel={t('gpsFilesCancel')}
        onConfirm={() => void handleDeleteAll()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
