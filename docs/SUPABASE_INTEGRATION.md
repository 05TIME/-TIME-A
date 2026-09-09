# TIMEŒ COMMAND — Supabase Integration

The canonical application uses Supabase for authentication, persistent business state, execution tasks, business actions, audit events, content attribution, and financial telemetry.

## Current project

The active TIMEŒ Supabase project is `TIMEOE LIVE`.

- Project ref: `tkqxqfkydxqxexgucgjr`
- Region: `us-west-1`
- Project URL: `https://tkqxqfkydxqxexgucgjr.supabase.co`

## Vercel environment variables

Configure these in the canonical Vercel project for Production, Preview, and Development as appropriate:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tkqxqfkydxqxexgucgjr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
SUPABASE_SECRET_KEY=<Supabase secret key>
TIMEOE_WORKER_SECRET=<worker secret>
TIMEOE_APP_URL=https://timeoe-command-two.vercel.app
TIMEOE_OUTREACH_PROVIDER=webhook
TIMEOE_WEBHOOK_ADAPTER_URL=<only when a real adapter is configured>
TIMEOE_DEFAULT_BUSINESS_ID=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is browser-safe. `SUPABASE_SECRET_KEY` and `TIMEOE_WORKER_SECRET` are server-only and must never be committed or exposed to client code.

## Database readiness

The project already contains the TIMEŒ tables required by the current application, including:

- `businesses`
- `memberships`
- `timeoe_agents`
- `timeoe_commands`
- `timeoe_execution_tasks`
- `timeoe_events`
- `timeoe_business_actions`
- `timeoe_cash_flow_controls`
- `timeoe_content_campaigns`
- `timeoe_content_posts`
- `timeoe_content_attribution`
- `timeoe_creators`
- `timeoe_social_channels`
- `transactions`
- `kpi_snapshots`

RLS is enabled on the TIMEŒ execution/content tables. Realtime publication currently includes `timeoe_business_actions`, `timeoe_events`, and `timeoe_execution_tasks`.

## Authentication flow

1. Browser authenticates with Supabase Auth using the publishable key.
2. The browser sends the Supabase access token as `Authorization: Bearer <token>` to protected TIMEŒ API routes.
3. Server routes validate the token with Supabase Auth.
4. Commands are bound to an authenticated business membership.
5. The bootstrap route creates the first business, owner membership, and conservative cash-flow controls when needed.
6. Server-only database operations use the Supabase secret key.

## First-run verification

1. Create/sign in to an account in TIMEŒ COMMAND.
2. Select **INITIALIZE BUSINESS**.
3. Confirm a `businesses` row and an owner `memberships` row are created.
4. Submit a harmless internal command.
5. Confirm rows appear in `timeoe_commands`, `timeoe_execution_tasks`, and `timeoe_events`.
6. Confirm the Command Center receives live task/event updates.

External actions remain approval-gated and require a configured provider adapter. The simulation adapter is explicitly marked as simulation and cannot create live revenue.

## Security notes

- Never put the Supabase secret key in `NEXT_PUBLIC_*` variables.
- Never commit `.env.local` or production secrets.
- Keep external-message, payout, spend, price-change, and contract actions behind the existing approval layer.
- Treat verified revenue as real only when a non-simulation provider explicitly returns a verified sale.
