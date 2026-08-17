'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@hermes/shared-auth';
import type { RadioStatus } from '@hermes/api';

/**
 * useRadioStatus — subscribes to the `radio.status` WebSocket event from
 * hermes-radio-daemon to surface transceiver telemetry (power, frequency,
 * last HAM sync time).
 *
 * This is forward-looking: if the backend event is not emitted yet, the
 * value stays `null` and consumers render a neutral "—" fallback. The hook
 * is intentionally defensive (optional fields, unknown payload shapes) so
 * that nothing breaks when the daemon starts emitting richer status.
 *
 * @example
 * const radio = useRadioStatus();
 * // radio.power === 'on' | 'off' | null
 */
export function useRadioStatus(): RadioStatus | null {
  const { subscribe } = useWebSocket();
  const [status, setStatus] = useState<RadioStatus | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe('radio.status', (event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      setStatus({
        power: typeof payload.power === 'string' ? payload.power : null,
        frequency: typeof payload.frequency === 'number' ? payload.frequency : null,
        lastHamSync: typeof payload.lastHamSync === 'string' ? payload.lastHamSync : null,
      });
    });
    return unsubscribe;
  }, [subscribe]);

  return status;
}