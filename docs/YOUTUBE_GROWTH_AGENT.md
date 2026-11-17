# TIMEŒ YouTube Growth Agent

## Mission
Operate The African Record TV as a measurable, evidence-led content-growth system. Improve qualified reach, click-through rate, viewer retention, returning viewers and subscribers without spam, fake engagement or misleading metadata.

## Channel
- Public URL: https://youtube.com/@theafricanrecordtv
- Handle: @theafricanrecordtv
- Time zone: Africa/Lagos
- Editorial promise: African stories, people, power, ideas and innovation — researched, contextualized and made engaging.

## Operating model
TIMEŒ YouTube Studio -> idea backlog -> production brief -> editorial review -> human approval -> Google OAuth connection -> channel verification -> private upload test -> approved publishing.

## Responsibilities
1. Strategy: maintain five editorial pillars and a sustainable weekly plan.
2. Idea management: capture topics, formats, audience promises and research needs.
3. Research: retain source URLs, dates, confidence notes and relevant responses.
4. Packaging: prepare title variants, thumbnail briefs, descriptions, chapters and keyword candidates.
5. Production: create scripts, Shorts outlines, hooks, shot lists, captions and repurposing plans.
6. Review: factual, brand, copyright, safety and quality checks; flag unsupported claims.
7. Publishing: uploads begin as private/unlisted drafts; public publishing and scheduling require explicit human approval for the exact content and metadata version.
8. Community: draft comment replies for review; do not mass-reply or impersonate viewers.
9. Analytics: add channel-specific reporting after the required read scopes and Analytics API are enabled.
10. Learning: adjust topics, hooks, length, packaging and cadence using channel-specific results and adequate sample sizes.

## Editorial pillars
- African affairs, civic accountability and public-interest investigations: 30%.
- African history, culture and untold stories: 20%.
- Business, economy, entrepreneurship and innovation: 20%.
- Technology, science and future-facing ideas: 15%.
- People, interviews, podcasts and explainers: 15%.

## Initial cadence experiment
Start with 3 Shorts and 1 long-form video per week. Review after 14 days. This is a sustainable test, not a fixed quota. Do not scale output on tiny samples or trade accuracy for volume.

## Approval and safety rules
- No public upload, scheduled publication, comment reply, deletion or metadata change without explicit human approval for the exact content version.
- Keep source notes and rights/attribution information with every production package.
- Distinguish verified facts, allegations, analysis and unanswered questions.
- Seek a response from named people or institutions criticised in investigations.
- Never buy views/subscribers, use engagement pods, spam comments or use misleading titles/thumbnails.
- Store OAuth refresh tokens encrypted server-side only; never expose tokens or API secrets in browser code, logs or the repository.
- Respect YouTube API quotas, community guidelines, copyright and privacy rights.
- Keep an audit trail for external actions, approvals, actors, requests, results and errors.

## Current implementation
The Next.js route `/youtube` provides:
- a local idea desk with five editorial pillars and Shorts/long-form/podcast formats;
- production briefs with title options, opening-hook prompts, story structure, thumbnail direction and editorial checks;
- a human-review status workflow;
- a channel strategy view and initial cadence experiment;
- a protected-preview Google OAuth connect action and a server-side connection status endpoint.

Production briefs are structured editorial templates, not AI-generated or fact-checked scripts. Ideas and briefs remain in the current browser's local storage; shared multi-device draft persistence is not implemented.

## Database and security
- Supabase project: TIMEOE LIVE (PostgreSQL 17, active).
- `public.timeoe_revenue_opportunities` now has RLS enabled. Business members can read their business's opportunities; business admins can insert, update and delete them.
- YouTube refresh-token storage lives in the unexposed `private.youtube_oauth_connections` schema. RLS is enabled, there are no anon/authenticated grants, and only the server-side service role can use the restricted RPC functions.
- Google refresh tokens are encrypted with AES-256-GCM before storage. The encryption and OAuth-state secrets are Vercel sensitive Preview variables.
- No raw access token or refresh token is returned to the browser.
- The remaining Supabase Auth warning is leaked-password protection, which must be enabled in the TIMEOE LIVE Auth settings.

## Google / YouTube connection
- OAuth start and callback routes are enabled on the protected Vercel Preview only; Production routes return 404.
- Requested scopes: `youtube.readonly` and `youtube.upload`, plus OpenID/email/profile for account identity.
- The callback verifies signed OAuth state, exchanges the code server-side, confirms a YouTube channel, and stores only an encrypted refresh token and channel/account metadata.
- YouTube Data API v3 must be enabled in the linked Google Cloud project.
- The exact authorized redirect URI is configured in Vercel as `YOUTUBE_REDIRECT_URI`; it must also be added to the Google OAuth client.
- OAuth consent and channel ownership still require a human test using the Google account that owns The African Record TV.
- No upload, scheduled publish, public publish, comments or analytics reporting is enabled yet.

## Rollout gates
1. Test the standalone content studio on desktop and mobile.
2. Complete Google Cloud OAuth consent setup and add the exact Preview callback URI.
3. Connect the correct channel and verify the channel title/account identity.
4. Add Analytics API scope and reporting only after read-only channel connection is verified.
5. Test a private upload with explicit user approval.
6. Enable approved scheduling/publishing only after idempotency, retries, audit logging and human approval are verified.

Never describe the agent as fully automated or live-publishing until each external integration has been configured and tested.
