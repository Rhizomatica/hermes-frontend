import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
  }

  const base = (process.env.HERMES_API_URL ?? 'http://localhost:3000').replace(/\/$/, '') + '/api/';
  const url = new URL('file', base);
  const cookie = request.headers.get('cookie') ?? '';
  const contentLength = request.headers.get('content-length');

  return new Promise<NextResponse>((resolve) => {
    const reqHeaders: Record<string, string | number> = { 'Content-Type': contentType };
    if (contentLength) reqHeaders['Content-Length'] = contentLength;
    if (cookie) reqHeaders['Cookie'] = cookie;

    const upstream = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: reqHeaders,
        agent: insecureAgent,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => {
          try {
            resolve(NextResponse.json(JSON.parse(raw), { status: res.statusCode ?? 200 }));
          } catch {
            resolve(NextResponse.json({ message: 'Invalid API response', raw: raw.slice(0, 400) }, { status: 502 }));
          }
        });
      },
    );

    upstream.on('error', () => {
      resolve(NextResponse.json({ message: 'Could not reach the Hermes API.' }, { status: 503 }));
    });

    // Stream the body directly instead of buffering — avoids empty-body issues with arrayBuffer()
    const reader = request.body?.getReader();
    if (!reader) { upstream.end(); return; }

    function pump() {
      reader!.read().then(({ done, value }) => {
        if (done) { upstream.end(); return; }
        upstream.write(value);
        pump();
      }).catch(() => upstream.end());
    }
    pump();
  });
}
