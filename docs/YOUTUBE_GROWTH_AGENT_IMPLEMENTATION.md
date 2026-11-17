# YouTube Growth Agent — Implementation Status

## Confirmed channel configuration
- Public channel URL: https://youtube.com/@theafricanrecordtv
- Handle: @theafricanrecordtv
- Primary timezone: Africa/Lagos
- Editorial mix: African affairs/accountability, history/culture, business/innovation, technology/future ideas, people/interviews/podcasts.
- Initial cadence: 3 Shorts + 1 long-form video per week, reviewed after 14 days.

## Standalone implementation
- App route: `packages/app/app/youtube/page.jsx`
- Route stylesheet: `packages/app/app/youtube/youtube.css`
- Open the workspace at `/youtube` on the TIMEŒ Preview.
- Idea desk: add/remove topics, choose editorial pillar and format.
- Production workspace: structured briefs with hook prompts, title variants, story outline, thumbnail direction and editorial checklist.
- Strategy view: five content pillars and initial cadence.
- Draft state: browser local storage; not shared between devices.
- Production briefs are deterministic templates, not AI-generated or fact-checked scripts.

## Supabase status
- Project: TIMEOE LIVE, ref `tkqxqfkydxqxexgucgjr`, PostgreSQL 17, `ACTIVE_HEALTHY`.
- Migration `secure_revenue_opportunities_rls`: enabled RLS on `public.timeoe_revenue_opportunities`; members can read business-scoped rows and admins can create/update/delete.
- Migration `create_private_youtube_oauth_store`: created `private.youtube_oauth_connections`, with RLS and no anon/authenticated schema or table access.
- Migration `add_service_role_youtube_token_rpcs`: added service-role-only RPCs for storing and reading encrypted connection data.
- Verified: service role can access the private schema/table; anon and authenticated cannot. Public RPC execution is denied to anon/authenticated and granted to service_role.
- Security Advisor no longer reports the public revenue-opportunities RLS issue.
- Remaining warning: Supabase Auth leaked-password protection is disabled. Enable it in Authentication > Settings / Password Security for TIMEOE LIVE. The available project tool connection is read/query oriented and cannot change this Auth dashboard setting.

## Google OAuth / YouTube API status
- OAuth start: `packages/app/app/api/youtube/oauth/start/route.js`
- OAuth callback: `packages/app/app/api/youtube/oauth/callback/route.js`
- Connection status: `packages/app/app/api/youtube/status/route.js`
- OAuth is restricted to Vercel Preview (`VERCEL_ENV=preview`) while the preview deployment remains protected by Vercel SSO.
- Vercel Preview variables configured: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_TOKEN_ENCRYPTION_KEY`, `YOUTUBE_OAUTH_STATE_SECRET`, `YOUTUBE_REDIRECT_URI`, and `YOUTUBE_SUPABASE_URL`.
- Redirect URI to add in Google Cloud Console:
  `https://timeoe-youtube-agent-git-feature-youtube-growth-agent-timeoe.vercel.app/api/youtube/oauth/callback`
- Requested scopes: YouTube read-only and upload, plus OpenID/email/profile.
- The callback verifies OAuth state, obtains the channel identity, encrypts the refresh token with AES-256-GCM, and persists it via service-role-only RPC. No token is returned to the browser.
- No video upload or public publishing is implemented. Analytics is not connected. Auto-publishing remains disabled.

## Required external setup
1. In Google Cloud Console, enable YouTube Data API v3 for the OAuth client's project.
2. Add the exact redirect URI above to the Web application OAuth client.
3. Complete the OAuth consent screen and add the channel-owning Google account as a test user if the app is in Testing.
4. Open the protected Preview, sign in to Vercel SSO, and click **Connect YouTube channel**.
5. Verify that the returned channel is The African Record TV before proceeding.

## Remaining work
1. Verify the current Preview build and OAuth callback access through Vercel SSO.
2. Complete the user's Google Cloud setup and perform the first channel connection.
3. Add Analytics API scope and reporting after channel identity is confirmed.
4. Build shared draft/approval persistence with user authentication and audit history.
5. Implement private video upload with retries, quota handling and idempotency.
6. Keep public publishing disabled until the user approves a specific upload/schedule workflow.

## Release gates
- No public publish or schedule without recorded human approval for the exact content and metadata version.
- No comment reply without approval.
- Verify OAuth scopes, channel identity, token encryption, RLS and audit logs.
- Test quota handling, retries, idempotency and token revocation.
- Do not claim the agent is fully operational until database persistence, OAuth and the relevant YouTube APIs are verified.
