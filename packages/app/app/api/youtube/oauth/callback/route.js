import { createHmac, timingSafeEqual, createCipheriv, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = '__Host-timeoe-youtube-oauth-state';
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
];

function redirectToStudio(request, status) {
  const target = new URL('/youtube', request.url);
  target.searchParams.set(status, '1');
  const response = NextResponse.redirect(target);
  response.cookies.delete(COOKIE_NAME);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function encryptRefreshToken(token) {
  const keyHex = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY || '';
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('Token encryption is not configured');
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse('YouTube OAuth is enabled on the protected preview only.', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('error')) return redirectToStudio(request, 'youtube_error');

  const code = searchParams.get('code');
  const returnedState = searchParams.get('state') || '';
  const cookieState = request.cookies.get(COOKIE_NAME)?.value || '';
  const stateSecret = process.env.YOUTUBE_OAUTH_STATE_SECRET || '';
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || '';
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  if (!code || !cookieState || !stateSecret || !redirectUri || !clientId || !clientSecret) {
    return redirectToStudio(request, 'youtube_error');
  }

  const expectedSignature = createHmac('sha256', Buffer.from(stateSecret, 'hex'))
    .update(cookieState.split('.')[0] || '')
    .digest('hex');
  const [cookieNonce, cookieSignature] = cookieState.split('.');
  const [returnedNonce, returnedSignature] = returnedState.split('.');
  const safeEqual = (a, b) => {
    const left = Buffer.from(a || '');
    const right = Buffer.from(b || '');
    return left.length === right.length && timingSafeEqual(left, right);
  };

  if (
    !cookieNonce || !cookieSignature ||
    !safeEqual(cookieNonce, returnedNonce) ||
    !safeEqual(cookieSignature, returnedSignature) ||
    !safeEqual(cookieSignature, expectedSignature)
  ) {
    return redirectToStudio(request, 'youtube_error');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.refresh_token || !tokens.access_token) {
      return redirectToStudio(request, 'youtube_error');
    }

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
      cache: 'no-store',
    });
    const user = userResponse.ok ? await userResponse.json() : {};

    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.searchParams.set('part', 'snippet');
    channelUrl.searchParams.set('mine', 'true');
    const channelResponse = await fetch(channelUrl, {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
      cache: 'no-store',
    });
    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];
    if (!channelResponse.ok || !channel?.id) return redirectToStudio(request, 'youtube_error');

    const encrypted = encryptRefreshToken(tokens.refresh_token);
    const supabaseUrl = process.env.YOUTUBE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !serviceKey) return redirectToStudio(request, 'youtube_error');

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const scopes = typeof tokens.scope === 'string'
      ? tokens.scope.split(' ').filter(Boolean)
      : [];
    if (!REQUIRED_SCOPES.every((scope) => scopes.includes(scope))) {
      return redirectToStudio(request, 'youtube_error');
    }
    const { error } = await supabase.rpc('upsert_youtube_oauth_connection', {
      p_google_account_email: user.email || null,
      p_channel_id: channel.id,
      p_channel_title: channel.snippet?.title || null,
      p_refresh_token_ciphertext: encrypted.ciphertext,
      p_refresh_token_iv: encrypted.iv,
      p_refresh_token_tag: encrypted.tag,
      p_encryption_key_version: 1,
      p_scopes: scopes,
      p_access_token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
    });
    if (error) return redirectToStudio(request, 'youtube_error');

    return redirectToStudio(request, 'youtube_connected');
  } catch {
    return redirectToStudio(request, 'youtube_error');
  }
}
