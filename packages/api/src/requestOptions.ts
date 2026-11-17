import type { RequestOptions } from 'node:https';

function getTlsServerName(): string | undefined {
  const value = process.env.HERMES_API_TLS_SERVERNAME?.trim();
  return value ? value : undefined;
}

export function buildRequestOptions(
  url: URL,
  method: string,
  headers: Record<string, string | number>,
): RequestOptions {
  const isHttps = url.protocol === 'https:';
  const options: RequestOptions = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method,
    headers,
  };

  if (isHttps) {
    const servername = getTlsServerName();
    if (servername) options.servername = servername;
  }

  return options;
}
