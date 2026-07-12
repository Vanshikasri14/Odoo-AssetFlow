# AssetFlow

**Enterprise Asset & Resource Management System** — track, allocate, book, maintain
and audit an organisation's physical assets and shared resources.

### 🔗 Live: **[odoo-assetflow.vercel.app](https://odoo-assetflow.vercel.app)**

Sign in with any of these — password `assetflow123`. The role changes what you see,
so it's worth trying more than one:

| Account | Role | What it shows you |
|---|---|---|
| `admin@assetflow.io` | **Admin** | Everything, plus Organization Setup — the only place roles can be granted |
| `manager@assetflow.io` | **Asset Manager** | Registers assets, approves transfers and maintenance |
| `vikram@assetflow.io` | **Department Head** | Approves within their department |
| `priya@assetflow.io` | **Employee** | Only their own assets — and holds the laptop in the demo below |

> The database sleeps when idle (free tier), so **the very first request after a quiet
> period takes a second or two**. Load it once, then it's fast.

Built for the Odoo hackathon. Next.js 16 · React 19 · TypeScript · Prisma · PostgreSQL.

---

## Try the four rules yourself

The interesting part of this app isn't the CRUD — it's what it *refuses* to do.

1. **Roles can't be self-assigned.** Sign up at
   [/signup](https://odoo-assetflow.vercel.app/signup). There is no role field, and
   the action never reads one. You land as an Employee. Only an Admin can promote you,
   from the Employee Directory.

2. **An asset can't be held by two people.** Sign in as the Asset Manager, go to
   Allocations, tick *"include assets that are already held"*, and try to allocate
   **AF-0101** (Priya's MacBook) to Raj. It refuses, *names Priya*, and offers a
   **Transfer Request** — which is what the brief actually asks for.

3. **A room can't be double-booked.** Room B2 is booked 09:00–10:00 today. Request
   **09:30–10:30** → rejected. Request **10:00–11:00** → accepted. Half-open intervals:
   slots that touch don't overlap.

4. **Repairs need approval first.** Raise a maintenance request on an allocated asset —
   it stays *Allocated*. Approve it as an Asset Manager, and only *then* does the asset
   flip to *Under Maintenance*.

Rules 2 and 3 are enforced by **Postgres itself**, not by application code. Prove it:

```bash
npx tsx scripts/verify-rules.ts     # attacks the tables directly, bypassing every guard
```

---

## The idea in one paragraph

Most asset trackers are a spreadsheet with a login screen. AssetFlow is built the
other way round: the **rules come first**. An asset is a state machine, custody is an
append-only ledger, and the two rules that actually matter — *an asset cannot be held
by two people at once*, and *a room cannot be double-booked* — are enforced by
**PostgreSQL itself**, not by application code that a race condition can walk straight
through.

Everything else — the history timeline, the activity log, the notification bell —
falls out of that design for free.

---

## Running it locally

```bash
npm install
cp .env.example .env      # add your Postgres connection string
npm run db:setup          # push schema → apply constraints → seed
npm run dev
```

`db:setup` seeds a plausible organisation: 12 people across 5 departments, 30 assets,
51 bookings, maintenance in three different states, and an audit cycle mid-flight — so
every screen has something real on it the moment you open it. Same accounts as above,
same password.

⚠️ **Read the `DATABASE_URL` comment in `.env.example` before you paste one in.** Using
Neon's *pooled* endpoint instead of the direct one costs ~300 ms on every query — we
measured 382 ms vs 72 ms — which turned every click into a two-second wait until we
caught it.

---

## The two rules, and why they live in the database

> *"Priya has Laptop AF-0114. If Raj tries to allocate it too, the system blocks it."*
>
> *"Room B2 is booked 9:00–10:00. A request for 9:30–10:30 gets rejected; a request
> for 10:00–11:00 is fine since it starts right after."*

The obvious implementation is a `SELECT` to check for a conflict, then an `INSERT`.
That is wrong, and it's wrong in the way that only shows up when it matters: two
requests can interleave between the two statements, both find no conflict, and both
insert. Double-click the Book button and you have double-booked the room.

So the rules live in the schema.

**Single custody** — a partial unique index. An allocation is *open* while
`returned_date IS NULL`:

```sql
CREATE UNIQUE INDEX asset_allocation_one_active_per_asset
  ON asset_allocation (asset_id)
  WHERE returned_date IS NULL;
```

Any number of *closed* (historical) allocations per asset; exactly one open one. Full
custody history and single-custody enforcement out of the same table.

**No overlapping bookings** — a GiST exclusion constraint:

```sql
ALTER TABLE resource_booking ADD CONSTRAINT resource_booking_no_overlap
  EXCLUDE USING gist (
    asset_id WITH =,
    tsrange(start_datetime, end_datetime, '[)') WITH &&
  ) WHERE (state = 'confirmed');
```

Note `'[)'` — the range is **half-open**. That is precisely what makes 10:00–11:00
legal against an existing 09:00–10:00 while 09:30–10:30 is rejected. A naive
`start <= existing_end` comparison gets the brief's own example wrong.

Cancelled bookings free their slot automatically, because the constraint is scoped
`WHERE state = 'confirmed'` — no row deleted, no history lost.

The service layer *also* checks, but only in order to raise a friendly, actionable
error ("currently held by Priya Sharma — request a transfer?") instead of a raw
constraint violation. **Correctness is the database's job; kindness is the
application's.**

Don't take our word for it. This script attacks the tables directly, bypassing every
service, guard and validation layer in the codebase:

```bash
npx tsx scripts/verify-rules.ts
```

```
RULE 1 — an asset cannot be held by two people at once
  ✓ AF-0101 is currently held by Priya Sharma
  ✓ Postgres REJECTED the second allocation (P2002 on ["asset_id"])

RULE 2 — bookings of one resource cannot overlap
  ✓ Room B2 (AF-0124) is booked 09:00–10:00 today
  ✓ Postgres REJECTED 09:30–10:30 (resource_booking_no_overlap)
  ✓ Postgres ACCEPTED 10:00–11:00 (touching endpoints do not overlap)

✓ Both rules are enforced at the database level.
```

---

## Database design

Modelled on **Odoo's ORM conventions**, because they are a good answer to problems
this domain genuinely has.

| Convention | Applied as |
|---|---|
| Module-prefixed snake_case tables | `res_users`, `hr_department`, `asset_asset`, `mail_message`, `ir_sequence` |
| Audit columns on every table | `create_date`, `write_date`, `create_uid`, `write_uid` |
| Archive, never delete | `active = false` — history and foreign keys survive |
| Many2one · Many2many · child tables | `*_id` · `audit_cycle_res_users_rel` · `audit_line` |
| Workflow models carry a `state` | Postgres native `ENUM`s |
| Human-readable codes from a sequence | `ir_sequence` → `AF-0101`, `MR-0001`, `AUD-001` |

`ir_sequence` earns its keep. Asset tags are issued under a row-level lock
(`SELECT … FOR UPDATE`), not by `COUNT(*) + 1` — which double-issues under concurrency
and collides with an already-used tag the moment a record is archived. A small table
that quietly prevents a whole class of bug.

### The lifecycle state machine

`asset_asset.state` is written in **exactly one place** in the codebase:
[`src/modules/asset/lifecycle.ts`](src/modules/asset/lifecycle.ts).

```
                    ┌──────────────────────────────┐
                    │                              ▼
   ┌────────────┐  allocate   ┌───────────┐  return   ┌───────────┐
   │  RESERVED  │◄────────────│ AVAILABLE │──────────►│ ALLOCATED │
   └────────────┘   reserve   └───────────┘  allocate └───────────┘
                                    ▲  │                    │
                        resolve     │  │ approve maintenance│
                                    │  ▼                    │
                          ┌─────────────────────┐◄──────────┘
                          │  UNDER_MAINTENANCE  │
                          └─────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
          ┌───────┐            ┌─────────┐          ┌──────────┐
          │ LOST  │            │ RETIRED │─────────►│ DISPOSED │
          └───────┘            └─────────┘          └──────────┘
```

Allocation, transfer, return, maintenance approval, maintenance resolution and audit
closure are — underneath — all the same operation: a **guarded transition plus a log
line**, inside one transaction. `transitionAsset()` refuses illegal moves, so you
cannot send a disposed asset for repair no matter which screen you start from.

### The chatter

Every transition writes to `mail_message` (Odoo's `mail.thread`, in miniature) in the
same transaction as the change it describes — so a rolled-back allocation can never
leave behind a phantom log entry claiming it happened.

One table, three screens, no bespoke wiring:

- **Activity log** → every row, newest first
- **Per-asset history** → `WHERE model = 'asset.asset' AND res_id = :id` — allocation
  *and* maintenance history from a single query
- **Notification bell** → `mail_notification`, the fan-out of a message to recipients

---

## Security model

> *"Signup creates an Employee account only — no role selection at signup. Admin
> promotes from the Employee Directory — this is the only place roles are assigned."*

- Signup does not read a `role` field. It does not accept one, hidden or otherwise —
  it hardcodes `employee`. POSTing `role=admin` at it achieves nothing.
- `role` is written by exactly one action — `promoteUser()` — guarded by
  `assertRole(["admin"])`.
- Guards live in the **service layer**, not the UI. Hiding a button is a courtesy to
  the user, not a security control; every mutating action re-checks for itself.
- Sessions are httpOnly JWT cookies, and the user is re-read from the database on each
  request rather than trusted from the token's claims — an Admin who demotes someone
  mid-session must have that take effect *now*, not in seven days when the token
  happens to expire.

---

## Architecture

Feature-first modules, each self-contained — mirroring the way Odoo ships addons.

```
src/
  modules/
    core/          ir_sequence · chatter (log + notify) · domain errors
    auth/          signup (employee-only) · login · session
    hr/            departments · categories · employee directory · role promotion
    asset/         registry · lifecycle state machine ⭐
    allocation/    custody · conflict rule ⭐ · transfer · return
    booking/       time-slot booking · overlap validation ⭐
    maintenance/   approval-gated repair workflow ⭐
    audit/         audit cycles · discrepancy reports
    analytics/     KPI dashboard · reports
  lib/             db · auth · rbac
  app/             routes — thin; they call services, they do not contain logic
prisma/
  schema.prisma    the model
  constraints.sql  the rules Prisma's DSL cannot express
  seed.ts          a plausible organisation
scripts/
  verify-rules.ts  proves the rules hold, by attacking the database directly
```

Every module has the same four layers: `schema.ts` (Zod) · `service.ts` (transactional
business logic) · `actions.ts` (server actions + RBAC guards) · `components/`.

Services accept a transaction client rather than importing the database directly, so
callers can compose them: *approve maintenance* atomically updates the request, flips
the asset state, writes the log line and fans out the notification — all of it, or
none of it.

---

## Scripts

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run db:setup` | Push schema → apply constraints → seed |
| `npm run db:reset` | Drop everything and start again |
| `npm run db:studio` | Browse the data |
| `npx tsx scripts/verify-rules.ts` | Prove the two rules are enforced |

---

## Deliberately out of scope

The brief excludes purchasing, invoicing and accounting, and we have held that line —
`acquisition_cost` exists purely to rank assets in reports, and is linked to nothing.

We also skipped multi-company (`company_id` on every table). It is the obvious next
step for a real ERP, but with no multi-company UI to justify it, it would have been
ceremony rather than architecture.
