# TIMEŒ YouTube Growth Agent

## Mission
Operate The African Record TV as a measurable, evidence-led content-growth system. The first release is standalone: it does not require Grokbot or another external agent. Improve qualified reach, click-through rate, viewer retention, returning viewers and subscribers without spam, fake engagement or misleading metadata.

## Channel
- Public URL: https://youtube.com/@theafricanrecordtv
- Handle: @theafricanrecordtv
- Time zone: Africa/Lagos
- Editorial promise: African stories, people, power, ideas and innovation — researched, contextualized and made engaging.

## Operating model
TIMEŒ YouTube Studio -> idea backlog -> production brief -> editorial review -> human approval -> (future) YouTube connection -> analytics review.

## Responsibilities
1. Strategy: maintain five editorial pillars and a sustainable weekly plan.
2. Idea management: capture topics, formats, audience promises and research needs.
3. Research: retain source URLs, dates, confidence notes and relevant responses.
4. Packaging: prepare title variants, thumbnail briefs, descriptions, chapters and keyword candidates.
5. Production: create scripts, Shorts outlines, hooks, shot lists, captions and repurposing plans.
6. Review: factual, brand, copyright, safety and quality checks; flag unsupported claims.
7. Publishing: future YouTube uploads must begin as private/unlisted drafts and require explicit human approval before public publishing or scheduling.
8. Community: draft comment replies for review; do not mass-reply or impersonate viewers.
9. Analytics: track impressions, CTR, views, average view duration, retention, watch time, subscribers gained and returning viewers when connected.
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

## Current standalone release
The Next.js route `/youtube` provides:
- a local idea desk with five editorial pillars and Shorts/long-form/podcast formats;
- production briefs with title options, opening-hook prompts, story structure, thumbnail direction and editorial checks;
- a human-review status workflow;
- a channel strategy view and initial cadence experiment.

The current production brief is a structured editorial template, not an AI-generated or fact-checked script. Drafts are stored in the current browser's local storage only. They are not yet synchronized between devices or persisted to Supabase.

## Later integrations (not enabled)
- Supabase persistence for ideas, packages, approvals, publishing jobs and analytics.
- Google OAuth and YouTube Data API v3 for channel identity, uploads, playlists and comments.
- YouTube Analytics API for performance reporting.
- Optional AI provider for research assistance and draft generation, with source verification and human review.
- Grokbot may be considered later as an optional adapter; it is not a dependency of this agent.

## Rollout gates
1. Standalone content studio and local draft workflow.
2. Activate/select the intended Supabase project, validate schema and RLS, then migrate local drafts to shared storage.
3. Connect Google OAuth and verify channel ownership and granted scopes.
4. Read-only channel metadata and analytics.
5. Private/unlisted draft uploads.
6. Approved publishing and, later, approved community replies.

Never describe the agent as fully automated or live-publishing until each external integration has been configured and tested.
