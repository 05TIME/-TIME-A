# Clutter

Standalone buy-and-resell operating app.

## Development boundary
- GitHub: source code and version control.
- Supabase: authentication, PostgreSQL data, and private media storage.
- Vercel: intentionally not used.

## Workflow
Seller submission -> Agent verification -> Manager approval -> Purchase -> Inventory -> Resale -> Sale.

## Backend
Use a dedicated Clutter Supabase project only. Do not reuse TIMEŒ production databases.
