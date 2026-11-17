# YouTube Growth Agent — Implementation Plan

## Confirmed channel configuration
- Public channel URL: https://youtube.com/@theafricanrecordtv
- Handle: @theafricanrecordtv
- Content direction: mixed editorial content across African affairs, history/culture, business/innovation, technology and interviews/podcasts.
- Schedule mode: analytics-led adaptive cadence.
- Initial experiment: 3 Shorts + 1 long-form weekly, reviewed after 14 days. This is a starting test, not a permanent quota.

## Architecture
TIMEŒ COMMAND orchestrates the workflow. Grokbot supplies trend intelligence, research leads, source notes and creative proposals. The YouTube Growth Agent turns approved ideas into scripts, metadata, production briefs, private uploads, scheduled publications and performance reports. Analytics feedback is sent back to Grokbot with sample sizes and baselines.

## Current implementation in this branch
- Agent architecture and safety requirements: `docs/YOUTUBE_GROWTH_AGENT.md`
- Grokbot event contract: `docs/GROKBOT_YOUTUBE_CONTRACT.md`
- Channel profile: `docs/THE_AFRICAN_RECORD_TV_CHANNEL_PROFILE.md`
- Pure planning/scoring/cadence primitives: `packages/engine/src/youtube-growth.js`
- Tests: `packages/engine/src/youtube-growth.test.js`

## External setup still required
1. Create/select a Google Cloud project and enable YouTube Data API v3 and YouTube Analytics API.
2. Configure OAuth consent screen and an OAuth web client. Request only required scopes; store refresh tokens encrypted on the server.
3. Add the authorized redirect URI after the production callback route is deployed.
4. Configure server-only environment variables: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`, `YOUTUBE_TOKEN_ENCRYPTION_KEY`, `GROKBOT_WEBHOOK_SECRET`.
5. Add a Supabase migration for channel connections, ideas, packages, approvals, publishing jobs, comments and analytics snapshots. Apply only after reviewing RLS policies.
6. Connect Grokbot using the signed event contract. Confirm its actual endpoint, authentication method and event schema before enabling delivery.
7. Connect the channel through OAuth and verify the returned channel ID/title. The public handle alone is not proof of account ownership.
8. Start in read-only mode, then content studio, private uploads, approved publishing, and finally approved community replies.

## Release gates
- No public publish or schedule without a recorded human approval for that exact content version.
- No comment reply without approval until moderation quality has been evaluated.
- Verify OAuth scopes, channel identity, token encryption, RLS and audit logs.
- Test quota handling, retries, idempotency and token revocation.
- Never claim that the agent is live until OAuth, database migration, Grokbot endpoint and deployment have all been verified.
