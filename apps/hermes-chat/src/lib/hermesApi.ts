import https from 'node:https';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function getBase(): string {
  const url = process.env.HERMES_API_URL ?? 'https://10.70.96.5';
  return url.endsWith('/') ? url : url + '/api/';
}

function hermesRequest(
  path: string,
  method: string,
  body?: string,
  cookie?: string,
): Promise<{ data: unknown; status: number }> {
  const url = new URL(path, getBase());
  return new Promise((resolve) => {
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (cookie) headers['Cookie'] = cookie;

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers,
        agent: insecureAgent,
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
  const url = new URL(path, getBase());
  const boundary = `----HermesBoundary${Date.now().toString(16)}`;

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

  return new Promise((resolve) => {
    const headers: Record<string, string | number> = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.byteLength,
    };
    if (cookie) headers['Cookie'] = cookie;

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        agent: insecureAgent,
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
  const url = new URL(path, getBase());

  return new Promise((resolve) => {
    const extraHeaders: Record<string, string> = cookie ? { Cookie: cookie } : {};
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { ...extraHeaders },
        agent: insecureAgent,
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
