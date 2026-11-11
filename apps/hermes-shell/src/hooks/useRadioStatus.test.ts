import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioStatus } from './useRadioStatus';

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@hermes/shared-auth', () => ({
  useWebSocket: () => ({ subscribe: mockSubscribe }),
}));

describe('useRadioStatus', () => {
  beforeEach(() => {
    mockSubscribe.mockReset();
    mockUnsubscribe.mockReset();
  });

  it('maps radio.state payload fields to RadioStatus', () => {
    let handler: ((event: { data?: unknown }) => void) | undefined;
    mockSubscribe.mockImplementation(
      (_topic: string, cb: (event: { data?: unknown }) => void) => {
        handler = cb;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useRadioStatus());

    expect(result.current).toBeNull();

    act(() => {
      handler?.({ data: { tx: true, frequency_hz: 7100000, mode: 'USB', power: 50 } });
    });

    expect(result.current).toEqual({
      tx: true,
      frequency: 7100000,
      mode: 'USB',
      power: 50,
    });
  });

  it('maps missing fields to null', () => {
    let handler: ((event: { data?: unknown }) => void) | undefined;
    mockSubscribe.mockImplementation(
      (_topic: string, cb: (event: { data?: unknown }) => void) => {
        handler = cb;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useRadioStatus());

    act(() => {
      handler?.({ data: {} });
    });

    expect(result.current).toEqual({ tx: null, frequency: null, mode: null, power: null });
  });
});
