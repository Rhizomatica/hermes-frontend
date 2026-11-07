import { NextRequest, NextResponse } from 'next/server';
import { hermesGetBuffer } from '@hermes/api';
import { mockGpsFileBuffer } from '@/lib/mockGps';

/**
 * GET /api/gps/files/[name]
 *
 * Proxies a single recorded position file from hermes-radio-daemon
 * `GET /api/v2/gps/files/{name}` and returns it as an `application/octet-stream`
 * download.
 *
 * @example
 * GET /api/gps/files/positions-20260812.gpx
 * → 200 (octet-stream, Content-Disposition: attachment)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  try {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name)) {
      return NextResponse.json(
        { message: 'Invalid file name.' },
        { status: 400 },
      );
    }

    if (process.env.NEXT_PUBLIC_MOCK_GPS === 'true') {
      const buffer = mockGpsFileBuffer(name);
      if (!buffer) {
        return NextResponse.json({ message: 'File not found.' }, { status: 404 });
      }
      return new NextResponse(buffer.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${name}"`,
        },
      });
    }

    const cookie = request.headers.get('cookie') ?? undefined;
    const { buffer, status, contentType } = await hermesGetBuffer(
      `/api/v2/gps/files/${encodeURIComponent(name)}`,
      cookie,
    );

    return new NextResponse(buffer.buffer as ArrayBuffer, {
      status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (error) {
    console.error(`[GET /api/gps/files/${name}]`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
