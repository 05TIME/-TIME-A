# TIMEŒ OS

TIMEŒ is an execution-oriented business operating system: **COMMAND → PLAN → GRAPH → AGENTS → EXECUTE → VERIFY → ADAPT → SCALE**.

## Engine
`packages/engine` contains the provider-agnostic execution kernel. It supports command IDs, dependency-aware task graphs, worker registration, parallel execution of ready tasks, lifecycle events, verification and bounded retries.

## Applications
- TIMEŒ Command Center: `/`
- TIMEŒ YouTube Growth Studio: `/youtube` — standalone content planning and production workspace for The African Record TV.

The YouTube Growth Studio currently stores drafts in browser local storage. Shared database persistence, Google OAuth, YouTube uploads and live analytics are later integration stages. Grokbot is optional and is not required.

## State model
`QUEUED → RUNNING → WAITING → VERIFIED → FAILED → RETRY → COMPLETED`

Real integrations (AI providers, payments, CRM, calendars, property operations, etc.) plug in as workers and remain behind approval and verification boundaries where actions have financial, legal or external consequences.
