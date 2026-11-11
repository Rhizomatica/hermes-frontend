/**
 * hermes WS proxy — dev-only reverse proxy for the daemon's WebSocket.
 *
 * Why this exists: the browser opens `new WebSocket(NEXT_PUBLIC_WS_URL)`
 * directly against the daemon, but the daemon requires an authenticated
 * session on `/api/v2/ws`. A browser cannot set an `Authorization` header on
 * a WebSocket upgrade, and the session token lives in an HttpOnly
 * `hermes_session` cookie (unreadable by JS), so the direct connection is
 * refused with 401. The REST API works because the Next.js route handlers
 * read that cookie server-side and forward it as `Authorization: Bearer`.
 *
 * This proxy does the same for the WebSocket: it reads `hermes_session` from
 * the incoming upgrade, then connects to the daemon with
 * `Authorization: Bearer <token>` and the `hermes.v1` subprotocol. Point
 * `NEXT_PUBLIC_WS_URL` at it (e.g. ws://localhost:8082/api/v2/ws).
 *
 * Usage:
 *   WS_PROXY_PORT=8082 HERMES_API_URL=http://10.70.96.19:8080/ node scripts/ws-proxy.mjs
 */
import http from 'node:http';
import { config as loadEnv } from 'dotenv';
import { WebSocket, WebSocketServer } from 'ws';

// Load the monorepo root env (mirrors next.config.ts). dotenv defaults to
// override:false, so a shell-provided value still wins.
loadEnv({ path: new URL('../.env', import.meta.url).pathname });
loadEnv({ path: new URL('../.env.local', import.meta.url).pathname });

const HOST = process.env.WS_PROXY_HOST ?? '0.0.0.0';
const PORT = Number(process.env.WS_PROXY_PORT ?? 8082);
const API_URL = process.env.HERMES_API_URL ?? 'http://localhost:8080';

const WS_PATH = '/api/v2/ws';

/** The daemon's WebSocket listener, derived from the REST base URL. */
function upstreamUrl() {
  const u = new URL(WS_PATH, API_URL);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return u.toString();
}

/** Read the opaque session token from the HttpOnly hermes_session cookie. */
function readSessionToken(req) {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(/(?:^|;\s*)hermes_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Answer an upgrade with a plain HTTP error (the browser reports it as a failed WS). */
function refuse(socket, status, detail) {
  if (socket.destroyed) return;
  const statusText = http.STATUS_CODES[status] ?? 'Error';
  const body = `${status} ${statusText}${detail ? `: ${detail}` : ''}\n`;
  socket.end(
    `HTTP/1.1 ${status} ${statusText}\r\n` +
      'Connection: close\r\n' +
      'Content-Type: text/plain\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      '\r\n' +
      body,
  );
}

const server = http.createServer((req, res) => {
  // Not a WebSocket upgrade — a small status page for sanity checks.
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Hermes WebSocket proxy\nconnect to ${WS_PATH}\nupstream: ${upstreamUrl()}\n`);
});

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => (protocols.has('hermes.v1') ? 'hermes.v1' : false),
});

server.on('upgrade', (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    return refuse(socket, 400, 'bad request');
  }

  if (pathname !== WS_PATH) return refuse(socket, 404, 'not found');

  const token = readSessionToken(req);
  if (!token) {
    return refuse(socket, 401, 'missing hermes_session cookie');
  }

  const upstream = new WebSocket(upstreamUrl(), ['hermes.v1'], {
    headers: { Authorization: `Bearer ${token}` },
  });

  let client = null;
  let settled = false;

  upstream.once('open', () => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      client = ws;
      ws.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      });
      ws.on('close', () => upstream.close());
      ws.on('error', () => upstream.close());
    });
  });

  upstream.on('message', (data, isBinary) => {
    if (client && client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
  });

  upstream.on('close', () => {
    if (client) client.close();
    else if (!settled) refuse(socket, 502, 'the daemon closed the connection');
    settled = true;
  });

  // A non-101 response from the daemon (401/403/426/404): relay its status.
  upstream.on('unexpected-response', (_req, res) => {
    if (!client && !settled) {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const detail = body.trim().slice(0, 200) || undefined;
        refuse(socket, res.statusCode ?? 502, detail);
      });
      res.on('error', () => refuse(socket, 502));
    }
    settled = true;
  });

  upstream.on('error', () => {
    if (client) client.close();
    else if (!settled) refuse(socket, 502, 'could not reach the daemon');
    settled = true;
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[ws-proxy] listening on http://${HOST}:${PORT}${WS_PATH}`);
  console.log(`[ws-proxy] forwarding to ${upstreamUrl()}`);
});
