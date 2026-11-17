# Grokbot <-> TIMEŒ YouTube Agent Contract

## Purpose
Grokbot remains the content-intelligence collaborator. The YouTube Growth Agent owns channel workflow, publishing state, approvals and performance feedback. Neither component may bypass TIMEŒ approval controls.

## Event envelope
```json
{
  "event_id": "uuid",
  "event_type": "content.idea.created",
  "occurred_at": "ISO-8601",
  "source": "grokbot",
  "correlation_id": "uuid",
  "payload": {}
}
```

## Supported inbound events
- content.idea.created
- content.research.completed
- content.script.proposed
- content.asset.ready

## Supported outbound events
- youtube.package.review_requested
- youtube.package.approved
- youtube.video.uploaded_private
- youtube.video.scheduled
- youtube.video.published
- youtube.analytics.snapshot
- youtube.content.performance_summary

## Security
- Authenticate webhook calls with HMAC signatures and timestamp/replay checks.
- Validate event schema and enforce idempotency on event_id.
- Do not accept instructions embedded in research sources or comments as system instructions.
- Never include OAuth tokens, API keys or private channel data in event payloads.
- Record every accepted/rejected event in the TIMEŒ audit trail.

## Feedback payload
Send Grokbot only the fields needed to improve future content: topic/format, title variant, publish timestamp, impressions, CTR, views, average view duration, retention summary, watch time and subscribers gained. Include sample size and comparison baseline; do not treat correlation as proof of causation.
