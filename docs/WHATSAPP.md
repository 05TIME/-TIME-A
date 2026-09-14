# TIMEŒ WhatsApp bridge

The Next.js app now exposes `GET/POST /api/webhooks/whatsapp` for Meta WhatsApp Cloud API webhooks.

## Environment variables

Set these as server-side environment variables in the deployment running `packages/app`:

- `WHATSAPP_ACCESS_TOKEN` — Meta WhatsApp Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID` — the WhatsApp Business phone number ID.
- `WHATSAPP_VERIFY_TOKEN` — a random secret you choose and enter in Meta webhook configuration.
- `WHATSAPP_GRAPH_API_VERSION` — the Graph API version supported by the Meta app; keep this configurable rather than hard-coding a version in the dashboard.
- `OPENAI_API_KEY` — server-side OpenAI API key.
- `TIMEOE_AI_MODEL` — the exact AI model identifier enabled for the account. Do not assume a model name that has not been enabled.
- `TIMEOE_WHATSAPP_SYSTEM_PROMPT` — optional system instructions for the WhatsApp agent.

## Meta webhook

Use the deployed URL:

`https://<your-production-host>/api/webhooks/whatsapp`

Configure the Meta webhook with:

- Verify token: the exact value of `WHATSAPP_VERIFY_TOKEN`.
- Callback URL: the URL above.
- Subscribe to the WhatsApp `messages` field.

The GET endpoint handles Meta's verification challenge. The POST endpoint accepts incoming text messages, sends the text to the configured AI model, and sends the generated response back through the WhatsApp Cloud API.

## Security

Never commit `WHATSAPP_ACCESS_TOKEN`, `OPENAI_API_KEY`, or the verify token to Git. Put them in Vercel/Render environment variables. The webhook ignores non-text messages for the initial bridge and logs failures server-side.

## Current status

The application-side bridge is committed. A live Meta connection still requires the Meta phone-number ID, access token, verify token, and the production deployment URL to be configured in the Meta dashboard and deployment environment. Those credentials are not stored in the repository.
