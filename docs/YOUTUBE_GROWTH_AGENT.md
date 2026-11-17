# TIMEŒ YouTube Growth Agent

## Mission
Operate the TIMEŒ YouTube channel as a measurable content-growth system. Coordinate with Grokbot as the upstream idea, research and creative-intelligence partner. The agent must improve qualified reach, click-through rate, viewer retention, returning viewers and subscribers without spam, fake engagement or misleading metadata.

## Operating model
TIMEŒ COMMAND -> Grokbot -> YouTube Growth Agent -> approval queue -> YouTube Data API -> analytics feedback -> Grokbot.

### Responsibilities
1. Trend research: identify timely topics and audience questions; retain source URLs, dates and confidence notes.
2. Strategy: score ideas by audience fit, demand, competition, freshness and production effort; maintain a weekly calendar.
3. Packaging: generate multiple title options, thumbnail briefs, descriptions, chapters, hashtags and keyword candidates.
4. Production: create long-form scripts, Shorts scripts, hooks, shot lists, captions and repurposing plans. Store source assets and rights/attribution notes.
5. Review: factual, brand, copyright, safety and quality checks; flag unsupported claims and reused material.
6. Publishing: upload as private/unlisted draft first, then publish or schedule only after explicit approval. Support Shorts and standard videos.
7. Community: classify comments, draft replies and identify recurring questions. Human approval required before posting replies initially; never mass-reply, solicit fake engagement or impersonate viewers.
8. Analytics: collect impressions, CTR, views, average view duration, retention, watch time, subscribers gained, traffic sources and returning viewers where available. Compare each video with the channel's own baseline.
9. Learning: feed measured outcomes to Grokbot to refine topics, hooks, length, packaging and publishing cadence.

## Agent contracts
### Grokbot input
- topic/idea and audience problem
- research notes with source URLs and timestamps
- suggested angle and evidence confidence
- draft script or creative assets, if available
- brand voice and campaign context

### YouTube Agent output
- content brief and audience promise
- fact-check / rights checklist
- title and thumbnail variants
- description, chapters, tags/hashtags
- video/Short production package
- approval request with exact public-facing changes
- upload ID, URL, scheduled/published state
- post-publication metrics and learning summary

## Approval and safety rules
- No public upload, scheduled publication, comment reply, deletion, or metadata change without an explicit approval record.
- Upload to private/unlisted first for review. Approval is scoped to a specific asset version and metadata version.
- Store OAuth refresh tokens encrypted server-side; never expose tokens or API secrets to the browser, logs, prompts or repository.
- Use least-privilege Google OAuth scopes. Revoke/disconnect must be supported.
- Respect YouTube API quotas, rate limits, community guidelines, copyright and privacy rights.
- Do not buy views/subscribers, run engagement pods, spam comments, scrape private data, or make deceptive claims.
- Avoid repetitive templated replies and misleading titles/thumbnails. Clearly disclose synthetic/altered content when required by YouTube policy.
- Keep audit events for every external action, actor, approval, request, result and error.

## Suggested implementation
- Next.js server routes/actions for dashboard and OAuth callbacks.
- Google OAuth 2.0 + YouTube Data API v3 for channel identity, uploads, playlists and comment operations.
- YouTube Analytics API for channel/video performance reporting.
- Supabase for channel connections, encrypted credential references, ideas, content assets, approval records, publishing jobs, comments and metric snapshots.
- TIMEŒ Engine workers for research, package generation, review, upload, scheduling, community triage and analytics.
- Grokbot adapter should be provider-agnostic and accept signed webhook events or internal task-graph messages. Never trust unsigned external payloads.

## Initial data model (proposed)
- youtube_channels: owner, channel_id, title, status, connected_at
- youtube_oauth_connections: channel_id, encrypted_refresh_token_ref, granted_scopes, expiry, revoked_at
- content_ideas: source, topic, audience, score, status, research_refs
- content_packages: idea_id, format, script, title_variants, description, thumbnail_brief, asset_refs, version
- content_approvals: package_id, version, action, approver, decision, decided_at
- publishing_jobs: package_id, visibility, scheduled_at, youtube_video_id, status, last_error
- community_items: youtube_comment_id, video_id, text, classification, reply_draft, approval_status
- analytics_snapshots: video_id, captured_at, impressions, ctr, views, watch_time, avg_view_duration, subscribers_gained, retention_data
- agent_events: actor, event_type, entity_id, approval_id, request_id, result, created_at

## Rollout phases
1. Read-only discovery: connect channel, inspect channel metadata and analytics, validate scopes.
2. Content studio: trend briefs, calendar, scripts, thumbnails and approval queue.
3. Draft publishing: upload private/unlisted and verify the resulting video.
4. Approved publishing: schedule/publish after approval; retain rollback and audit records.
5. Community and optimization: approved comment replies and weekly analytics feedback to Grokbot.

## Configuration still required
- Exact YouTube channel URL or channel ID
- Brand/niche and target audience
- Grokbot integration endpoint or existing module and authentication contract
- Google Cloud OAuth client and consent-screen setup
- Preferred publishing cadence and time zone
- Approval policy (owner-only or delegated approvers)
