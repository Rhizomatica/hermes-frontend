import http from 'node:http';
import https from 'node:https';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function getBase(): string {
  const url = process.env.HERMES_API_URL ?? 'http://localhost:3000/';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getAccessTokenFromCookie(cookie?: string): string | null {
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)hermes_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildAuthHeaders(cookie?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  const token = getAccessTokenFromCookie(cookie);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function hermesRequest(
  path: string,
  method: string,
  body?: string,
  cookie?: string,
): Promise<{ data: unknown; status: number }> {
  const base = getBase();
  const url = new URL(path.startsWith('/') ? path : '/' + path, base);
  const isHttps = url.protocol === 'https:';

  return new Promise((resolve) => {
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(cookie),
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const transport = isHttps ? https : http;

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        agent: isHttps ? insecureAgent : undefined,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ data: JSON.parse(raw), status: res.statusCode ?? 200 });
          } catch {
            resolve({ data: { message: 'Invalid API response', raw: raw.slice(0, 400) }, status: 502 });
          }
        });
      },
    );

    req.on('error', () => {
      resolve({ data: { message: 'Could not reach the Hermes API.' }, status: 503 });
    });

    if (body) req.write(body);
    req.end();
  });
}

export type { GpsPosition, GpsFix, Message, Conversation, Station, HermesUser } from './types';
export { destArray, stationId, canonicalize } from './normalize';
export { buildConversations, filterConversation } from './conversation';

export const hermesGet = (path: string, cookie?: string) =>
  hermesRequest(path, 'GET', undefined, cookie);

export const hermesPost = (path: string, body: unknown, cookie?: string) =>
  hermesRequest(path, 'POST', JSON.stringify(body), cookie);

export const hermesDelete = (path: string, cookie?: string) =>
  hermesRequest(path, 'DELETE', undefined, cookie);

interface MultipartFile {
  fieldName: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export function hermesPostMultipart(
  path: string,
  fields: Array<[string, string]>,
  file: MultipartFile,
  cookie?: string,
): Promise<{ data: unknown; status: number }> {
  const base = getBase();
  const url = new URL(path.startsWith('/') ? path : '/' + path, base);
  const boundary = `----HermesBoundary${Date.now().toString(16)}`;
  const isHttps = url.protocol === 'https:';

  const parts: Buffer[] = [];
  for (const [name, value] of fields) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  }
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`,
  ));
  parts.push(file.buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  const transport = isHttps ? https : http;

  return new Promise((resolve) => {
    const headers: Record<string, string | number> = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.byteLength,
      ...buildAuthHeaders(cookie),
    };

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        agent: isHttps ? insecureAgent : undefined,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ data: JSON.parse(raw), status: res.statusCode ?? 200 });
          } catch {
            resolve({ data: { message: 'Invalid API response', raw: raw.slice(0, 400) }, status: 502 });
          }
        });
      },
    );
    req.on('error', () => resolve({ data: { message: 'Could not reach the Hermes API.' }, status: 503 }));
    req.write(body);
    req.end();
  });
}

export function hermesGetBuffer(
  path: string,
  cookie?: string,
): Promise<{ buffer: Buffer; status: number; contentType: string }> {
  const base = getBase();
  const url = new URL(path.startsWith('/') ? path : '/' + path, base);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;

  return new Promise((resolve) => {
    const extraHeaders: Record<string, string> = buildAuthHeaders(cookie);
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: { ...extraHeaders },
        agent: isHttps ? insecureAgent : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => { chunks.push(chunk); });
        res.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            status: res.statusCode ?? 200,
            contentType: res.headers['content-type'] ?? 'application/octet-stream',
          });
        });
      },
    );
    req.on('error', () => resolve({ buffer: Buffer.alloc(0), status: 503, contentType: 'application/octet-stream' }));
    req.end();
  });
}