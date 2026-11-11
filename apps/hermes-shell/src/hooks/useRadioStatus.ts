'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@hermes/shared-auth';
import type { RadioStatus } from '@hermes/api';

/**
 * useRadioStatus — subscribes to the hermes-radio-daemon `radio.state`
 * WebSocket topic to surface the transceiver fields the shell shows:
 * TX/RX, operating frequency, mode and power. Unknown/missing fields map to
 * null so the UI renders a neutral fallback.
 *
 * @example
 * const radio = useRadioStatus();
 * // radio.frequency === 7080000 | null
 */
export function useRadioStatus(): RadioStatus | null {
  const { subscribe } = useWebSocket();
  const [status, setStatus] = useState<RadioStatus | null>(null);

  useEffect(() => {
    // In mock mode there is no live radio state to subscribe to.
    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') return;

    const unsubscribe = subscribe('radio.state', (event) => {
      const payload = (event.data ?? {}) as Record<string, unknown>;
      setStatus({
        tx: typeof payload.tx === 'boolean' ? payload.tx : null,
        frequency: typeof payload.frequency_hz === 'number' ? payload.frequency_hz : null,
        mode: typeof payload.mode === 'string' ? payload.mode : null,
        power: typeof payload.power === 'number' ? payload.power : null,
      });
    });

    return unsubscribe;
  }, [subscribe]);

  return status;
}
