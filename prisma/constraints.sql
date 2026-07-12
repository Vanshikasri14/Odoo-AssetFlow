-- ═══════════════════════════════════════════════════════════════════════════
--  DATABASE-LEVEL BUSINESS RULES
--
--  Prisma's schema language cannot express partial unique indexes, exclusion
--  constraints or CHECKs, so they live here and are appended to the generated
--  migration (npm run db:migrate does this for you).
--
--  Why bother, when the service layer already validates?
--  Because validation in application code is a READ followed by a WRITE, and
--  two requests can interleave between the two. Under concurrency, "SELECT ...
--  no conflict found ... INSERT" double-books the room. These constraints make
--  the rules unbreakable — the second transaction is rejected by Postgres.
--  The service-layer check stays, but only to produce a friendly error message
--  instead of a raw constraint violation.
-- ═══════════════════════════════════════════════════════════════════════════

-- Needed to mix equality (asset_id) with range overlap (&&) in one GiST index.
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ───────────────────────────────────────────────────────────────────────────
--  RULE 1 — An asset can be held by at most one party at a time.
--
--  "Priya has Laptop AF-0114. If Raj tries to allocate it too, the system
--   blocks it."  ← the brief.
--
--  An allocation row is OPEN while returned_date IS NULL. A partial unique
--  index on asset_id, restricted to open rows, permits any number of *closed*
--  (historical) allocations while allowing exactly one open one.
--  This is how you get full custody history AND single-custody enforcement out
--  of the same table.
-- ───────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS asset_allocation_one_active_per_asset
  ON asset_allocation (asset_id)
  WHERE returned_date IS NULL;


-- An allocation is held by a person XOR a department — never both, never neither.
ALTER TABLE asset_allocation
  DROP CONSTRAINT IF EXISTS asset_allocation_holder_xor;
ALTER TABLE asset_allocation
  ADD CONSTRAINT asset_allocation_holder_xor CHECK (
    (holder_user_id IS NOT NULL AND holder_dept_id IS NULL) OR
    (holder_user_id IS NULL     AND holder_dept_id IS NOT NULL)
  );


-- ───────────────────────────────────────────────────────────────────────────
--  RULE 2 — Confirmed bookings of one resource may not overlap in time.
--
--  "Room B2 is booked 9:00-10:00. A request for 9:30-10:30 gets rejected since
--   it overlaps; a request for 10:00-11:00 is fine since it starts right after."
--   ← the brief.
--
--  Note the range is HALF-OPEN: '[)' includes the start instant and excludes
--  the end instant. That is precisely what makes 10:00-11:00 legal against an
--  existing 09:00-10:00 — the two ranges touch but do not overlap. A naive
--  `start <= existing_end` check would wrongly reject it.
--
--  WHERE (state = 'confirmed') means cancelled bookings free their slot up
--  automatically, without deleting the row and losing the history.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE resource_booking
  DROP CONSTRAINT IF EXISTS resource_booking_no_overlap;
ALTER TABLE resource_booking
  ADD CONSTRAINT resource_booking_no_overlap EXCLUDE USING gist (
    asset_id WITH =,
    tsrange(start_datetime, end_datetime, '[)') WITH &&
  ) WHERE (state = 'confirmed');


-- A booking must end after it starts.
ALTER TABLE resource_booking
  DROP CONSTRAINT IF EXISTS resource_booking_end_after_start;
ALTER TABLE resource_booking
  ADD CONSTRAINT resource_booking_end_after_start
  CHECK (end_datetime > start_datetime);


-- ───────────────────────────────────────────────────────────────────────────
--  RULE 3 — An audit cycle must not end before it starts.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_cycle
  DROP CONSTRAINT IF EXISTS audit_cycle_end_after_start;
ALTER TABLE audit_cycle
  ADD CONSTRAINT audit_cycle_end_after_start CHECK (date_end >= date_start);


-- ───────────────────────────────────────────────────────────────────────────
--  RULE 4 — A department cannot be its own parent (one-level guard; a full
--  cycle check would need a recursive trigger, which is overkill here).
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE hr_department
  DROP CONSTRAINT IF EXISTS hr_department_no_self_parent;
ALTER TABLE hr_department
  ADD CONSTRAINT hr_department_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id);


-- ───────────────────────────────────────────────────────────────────────────
--  Audit columns (create_uid / write_uid) are declared as plain integers in
--  schema.prisma rather than Prisma relations — declaring them as relations
--  would force ~24 unreadable back-reference fields onto res_users. The
--  referential integrity is restored here, where it belongs.
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'res_users','hr_department','asset_category','asset_asset','asset_allocation',
    'asset_transfer_request','resource_booking','maintenance_request',
    'audit_cycle','audit_line'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;', t, t || '_create_uid_fkey');
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (create_uid) REFERENCES res_users(id) ON DELETE SET NULL;',
      t, t || '_create_uid_fkey');

    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;', t, t || '_write_uid_fkey');
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (write_uid) REFERENCES res_users(id) ON DELETE SET NULL;',
      t, t || '_write_uid_fkey');
  END LOOP;
END $$;
