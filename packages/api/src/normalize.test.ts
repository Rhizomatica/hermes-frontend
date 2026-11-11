import { describe, it, expect } from 'vitest';
import { destArray, stationId, canonicalize } from './normalize';

describe('destArray', () => {
  it('returns the array unchanged when already an array', () => {
    const arr = ['PU2UIT-3', 'PY2ZZ'];
    expect(destArray(arr)).toBe(arr);
  });

  it('wraps a non-empty string in an array', () => {
    expect(destArray('PU2UIT-3')).toEqual(['PU2UIT-3']);
  });

  it('returns an empty array for an empty string', () => {
    expect(destArray('')).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(destArray(undefined)).toEqual([]);
  });

  it('returns an empty array for null', () => {
    expect(destArray(null)).toEqual([]);
  });

  it('returns an empty array for an empty array', () => {
    expect(destArray([])).toEqual([]);
  });
});

describe('stationId', () => {
  it('strips @domain suffix', () => {
    expect(stationId('PU2UIT-3@hermes.local')).toBe('pu2uit-3');
  });

  it('strips .domain suffix', () => {
    expect(stationId('pu2uit-3.hermes.local')).toBe('pu2uit-3');
  });

  it('lowercases and trims', () => {
    expect(stationId('  PU2UIT-3 ')).toBe('pu2uit-3');
  });

  it('handles a bare callsign with no separators', () => {
    expect(stationId('PY2ZZ')).toBe('py2zz');
  });

  it('returns empty string for empty input', () => {
    expect(stationId('')).toBe('');
  });
});

describe('canonicalize', () => {
  const aliasMap = new Map([['pu2uit-3', 'estacao3']]);

  it('resolves a real callsign to its alias', () => {
    expect(canonicalize('PU2UIT-3@hermes.local', aliasMap)).toBe('estacao3');
  });

  it('passes through an alias unchanged', () => {
    expect(canonicalize('estacao3', aliasMap)).toBe('estacao3');
  });

  it('returns the bare id when no alias exists', () => {
    expect(canonicalize('PY2ZZ', aliasMap)).toBe('py2zz');
  });
});