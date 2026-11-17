import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequestOptions } from './requestOptions';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildRequestOptions', () => {
  it('sets servername for HTTPS when the env var is present', () => {
    vi.stubEnv('HERMES_API_TLS_SERVERNAME', 'caldono.hermes.radio');

    const options = buildRequestOptions(new URL('https://10.70.96.210:8080'), 'GET', {});

    expect(options.servername).toBe('caldono.hermes.radio');
    expect(options.hostname).toBe('10.70.96.210');
    expect(options.port).toBe('8080');
  });

  it('omits servername for HTTPS when the env var is absent', () => {
    const options = buildRequestOptions(new URL('https://10.70.96.210:8080'), 'GET', {});

    expect(options).not.toHaveProperty('servername');
  });

  it('omits servername for HTTP even when the env var is present', () => {
    vi.stubEnv('HERMES_API_TLS_SERVERNAME', 'caldono.hermes.radio');

    const options = buildRequestOptions(new URL('http://localhost:8080'), 'GET', {});

    expect(options).not.toHaveProperty('servername');
    expect(options.port).toBe('8080');
  });

  it('never disables certificate verification', () => {
    vi.stubEnv('HERMES_API_TLS_SERVERNAME', 'caldono.hermes.radio');

    const options = buildRequestOptions(new URL('https://10.70.96.210:8080'), 'GET', {});

    expect(options).not.toHaveProperty('rejectUnauthorized');
    expect(options.rejectUnauthorized).toBeUndefined();
  });

  it('ignores a blank env var', () => {
    vi.stubEnv('HERMES_API_TLS_SERVERNAME', '   ');

    const options = buildRequestOptions(new URL('https://10.70.96.210:8080'), 'GET', {});

    expect(options).not.toHaveProperty('servername');
  });
});
