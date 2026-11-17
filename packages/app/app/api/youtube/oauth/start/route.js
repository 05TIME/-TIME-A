import { createHmac, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = '__Host-timeoe-youtube-oauth-state';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
];

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse('YouTube OAuth is enabled on the protected preview only.', { status: 404 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const stateSecret = process.env.YOUTUBE_OAUTH_STATE_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !stateSecret || !redirectUri) {
    return new NextResponse('YouTube OAuth is not configured.', { status: 503 });
  }

  const state = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', Buffer.from(stateSecret, 'hex')).update(state).digest('hex');
  const signedState = state + '.' + signature;

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', SCOPES.join(' '));
  authorizationUrl.searchParams.set('access_type', 'offline');
  authorizationUrl.searchParams.set('prompt', 'consent select_account');
  authorizationUrl.searchParams.set('include_granted_scopes', 'true');
  authorizationUrl.searchParams.set('state', signedState);

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(COOKIE_NAME, signedState, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
