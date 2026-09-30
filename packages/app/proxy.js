import { NextResponse } from 'next/server';

export function proxy(request) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.TIMEOE_FRONTEND_ORIGIN || origin || '*';

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Timeoe-Worker-Secret',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Timeoe-Worker-Secret');
  response.headers.set('Vary', 'Origin');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
