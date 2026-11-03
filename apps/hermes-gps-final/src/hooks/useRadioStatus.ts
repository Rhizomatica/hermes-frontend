'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@hermes/shared-auth';
import type { RadioStatus } from '@hermes/api';

/**
 * useRadioStatus — subscribes to the hermes-radio-daemon `radio.state`
 * WebSocket topic to surface transceiver telemetry (operating frequency).
 *
 * This is forward-looking: the daemon's `RadioState` has no on/off power or
 * HAM-sync fields, so those stay `null` and consumers render a neutral "—"
 * fallback. The hook is intentionally defensive (optional fields, unknown
 * payload shapes).
 *
 * @example
 * const radio = useRadioStatus();
 * // radio.frequency === 7080000 | null
 */
export function useRadioStatus(): RadioStatus | null {
  const { subscribe } = useWebSocket();
  const [status, setStatus] = useState<RadioStatus | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe('radio.state', (event) => {
      const payload = (event.data ?? {}) as Record<string, unknown>;
      setStatus({
        power: null,
        frequency: typeof payload.frequency_hz === 'number' ? payload.frequency_hz : null,
        lastHamSync: null,
      });
    });
    return unsubscribe;
  }, [subscribe]);

  return status;
}