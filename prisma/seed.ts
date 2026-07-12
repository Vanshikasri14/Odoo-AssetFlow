/**
 * Seed — a small but *plausible* organisation.
 *
 * A hackathon demo dies on empty tables. Everything below exists so that every
 * screen has something real on it the moment you open it: overdue returns on
 * the dashboard, a week of bookings in the heatmap, maintenance in three
 * different states, an audit cycle mid-flight.
 *
 * Two fixtures are load-bearing — the brief's own examples. Do not remove them:
 *   • PRIYA holds a MacBook. Allocating it to RAJ must be blocked.
 *   • ROOM B2 is booked 09:00–10:00 today. 09:30–10:30 must be rejected,
 *     10:00–11:00 must be accepted.
 *
 * NOTE: this script writes `asset.state` directly, which application code must
 * never do. A seed is the one legitimate exception — it is establishing the
 * initial world, not transitioning within it. It still writes mail_message rows
 * so that history timelines aren't empty on day one.
 */
import { PrismaClient, type AssetState, type AssetCondition } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? "assetflow123";

/** Today at a given wall-clock hour — used to pin the demo bookings. */
function todayAt(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱  Seeding AssetFlow…\n");

  // Idempotent: wipe in FK-safe order so `npm run db:seed` can be re-run freely.
  await db.mailNotification.deleteMany();
  await db.mailMessage.deleteMany();
  await db.auditLine.deleteMany();
  await db.auditCycleAuditor.deleteMany();
  await db.auditCycle.deleteMany();
  await db.maintenanceRequest.deleteMany();
  await db.resourceBooking.deleteMany();
  await db.assetTransferRequest.deleteMany();
  await db.assetAllocation.deleteMany();
  await db.assetAsset.deleteMany();
  await db.assetCategory.deleteMany();
  await db.resUsers.updateMany({ data: { departmentId: null } });
  await db.hrDepartment.updateMany({ data: { managerId: null, parentId: null } });
  await db.hrDepartment.deleteMany();
  await db.resUsers.deleteMany();
  await db.irSequence.deleteMany();

  // ── ir_sequence ────────────────────────────────────────────────────────────
  // Starting the asset counter at 101 so tags look like an org that has been
  // running for a while, rather than one seeded five minutes ago.
  await db.irSequence.createMany({
    data: [
      { code: "asset.asset", name: "Asset Tag", prefix: "AF-", padding: 4, numberNext: 101 },
      { code: "maintenance.request", name: "Maintenance Request", prefix: "MR-", padding: 4, numberNext: 1 },
      { code: "audit.cycle", name: "Audit Cycle", prefix: "AUD-", padding: 3, numberNext: 1 },
      { code: "asset.transfer.request", name: "Transfer Request", prefix: "TR-", padding: 4, numberNext: 1 },
    ],
  });
  console.log("  ✓ ir_sequence");

  // ── Departments ────────────────────────────────────────────────────────────
  const admin_ = await db.hrDepartment.create({ data: { name: "Administration", completeName: "Administration", sequence: 1 } });
  const it = await db.hrDepartment.create({ data: { name: "Information Technology", completeName: "Administration / Information Technology", parentId: admin_.id, sequence: 2 } });
  const facilities = await db.hrDepartment.create({ data: { name: "Facilities", completeName: "Administration / Facilities", parentId: admin_.id, sequence: 3 } });
  const engineering = await db.hrDepartment.create({ data: { name: "Engineering", completeName: "Engineering", sequence: 4 } });
  const sales = await db.hrDepartment.create({ data: { name: "Sales", completeName: "Sales", sequence: 5 } });
  console.log("  ✓ 5 departments (with hierarchy)");

  // ── Users ──────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 10);
  const mk = (name: string, login: string, role: "admin" | "asset_manager" | "dept_head" | "employee", departmentId: number, jobTitle: string) =>
    db.resUsers.create({ data: { name, login, password: hash, role, departmentId, jobTitle } });

  const aarav = await mk("Aarav Mehta", "admin@assetflow.io", "admin", admin_.id, "Operations Director");
  const neha = await mk("Neha Kulkarni", "manager@assetflow.io", "asset_manager", it.id, "Asset Manager");
  const vikram = await mk("Vikram Rao", "vikram@assetflow.io", "dept_head", it.id, "Head of IT");
  const sara = await mk("Sara Fernandes", "sara@assetflow.io", "dept_head", engineering.id, "Head of Engineering");

  const priya = await mk("Priya Sharma", "priya@assetflow.io", "employee", engineering.id, "Senior Engineer");
  const raj = await mk("Raj Malhotra", "raj@assetflow.io", "employee", engineering.id, "Engineer");
  const ananya = await mk("Ananya Iyer", "ananya@assetflow.io", "employee", sales.id, "Account Executive");
  const karthik = await mk("Karthik Nair", "karthik@assetflow.io", "employee", engineering.id, "QA Engineer");
  const meera = await mk("Meera Joshi", "meera@assetflow.io", "employee", sales.id, "Sales Associate");
  const rahul = await mk("Rahul Verma", "rahul@assetflow.io", "employee", it.id, "Support Engineer");
  const divya = await mk("Divya Menon", "divya@assetflow.io", "employee", facilities.id, "Facilities Coordinator");
  const imran = await mk("Imran Sheikh", "imran@assetflow.io", "employee", facilities.id, "Maintenance Technician");

  await db.hrDepartment.update({ where: { id: it.id }, data: { managerId: vikram.id } });
  await db.hrDepartment.update({ where: { id: engineering.id }, data: { managerId: sara.id } });
  await db.hrDepartment.update({ where: { id: admin_.id }, data: { managerId: aarav.id } });
  await db.hrDepartment.update({ where: { id: facilities.id }, data: { managerId: divya.id } });
  console.log("  ✓ 12 users (1 admin, 1 asset manager, 2 dept heads, 8 employees)");

  // ── Categories ─────────────────────────────────────────────────────────────
  const electronics = await db.assetCategory.create({ data: { name: "Electronics", code: "ELEC", warrantyMonths: 24, description: "Laptops, phones, tablets, displays", sequence: 1 } });
  const peripherals = await db.assetCategory.create({ data: { name: "Peripherals", code: "PERI", warrantyMonths: 12, description: "Mice, keyboards, headsets", sequence: 2 } });
  const furniture = await db.assetCategory.create({ data: { name: "Furniture", code: "FURN", description: "Desks, chairs, cabinets", sequence: 3 } });
  const vehicles = await db.assetCategory.create({ data: { name: "Vehicles", code: "VEHI", warrantyMonths: 36, description: "Company cars and vans", sequence: 4 } });
  const rooms = await db.assetCategory.create({ data: { name: "Meeting Rooms", code: "ROOM", description: "Bookable spaces", sequence: 5 } });
  const tools = await db.assetCategory.create({ data: { name: "Tools", code: "TOOL", description: "Maintenance equipment", sequence: 6 } });
  console.log("  ✓ 6 categories");

  // ── Assets ─────────────────────────────────────────────────────────────────
  // Tags are issued the real way — by ir_sequence, under a row lock — not by a
  // hand-written counter, so the seed exercises the same path the app does.
  async function nextTag(): Promise<string> {
    const rows = await db.$queryRaw<{ prefix: string; padding: number; number_next: number }[]>`
      SELECT prefix, padding, number_next FROM ir_sequence WHERE code = 'asset.asset' FOR UPDATE`;
    const s = rows[0];
    await db.$executeRaw`UPDATE ir_sequence SET number_next = number_next + number_increment WHERE code = 'asset.asset'`;
    return `${s.prefix}${String(s.number_next).padStart(s.padding, "0")}`;
  }

  type AssetSpec = {
    name: string; categoryId: number; departmentId?: number; serial?: string;
    cost: number; condition?: AssetCondition; location: string;
    bookable?: boolean; state?: AssetState; days: number; // days ago acquired
  };

  const specs: AssetSpec[] = [
    // Electronics
    { name: 'MacBook Pro 14"', categoryId: electronics.id, departmentId: engineering.id, serial: "C02X1234JGH5", cost: 189000, location: "Bengaluru HQ / Floor 3", days: 420 },
    { name: 'MacBook Pro 16"', categoryId: electronics.id, departmentId: engineering.id, serial: "C02X9876JGH5", cost: 249000, location: "Bengaluru HQ / Floor 3", days: 300 },
    { name: "Dell Latitude 5540", categoryId: electronics.id, departmentId: it.id, serial: "DL5540-8821", cost: 92000, location: "Bengaluru HQ / Floor 2", days: 210 },
    { name: "Dell Latitude 5540", categoryId: electronics.id, departmentId: it.id, serial: "DL5540-8822", cost: 92000, location: "Bengaluru HQ / Floor 2", days: 210 },
    { name: "Lenovo ThinkPad X1", categoryId: electronics.id, departmentId: sales.id, serial: "TP-X1-4410", cost: 134000, location: "Pune Office", days: 150 },
    { name: "iPad Pro 11", categoryId: electronics.id, departmentId: sales.id, serial: "IPD-77120", cost: 81000, location: "Pune Office", days: 95 },
    { name: "iPhone 15", categoryId: electronics.id, departmentId: sales.id, serial: "IPH-55301", cost: 79900, location: "Pune Office", days: 60 },
    { name: 'Dell UltraSharp 27"', categoryId: electronics.id, departmentId: engineering.id, serial: "U2723-0091", cost: 38000, location: "Bengaluru HQ / Floor 3", days: 380 },
    { name: 'Dell UltraSharp 27"', categoryId: electronics.id, departmentId: engineering.id, serial: "U2723-0092", cost: 38000, location: "Bengaluru HQ / Floor 3", days: 380, condition: "poor" },
    { name: "Epson EB-2250U Projector", categoryId: electronics.id, departmentId: facilities.id, serial: "EPS-2250-11", cost: 64000, location: "Bengaluru HQ / Store", bookable: true, days: 500 },
    // Peripherals
    { name: "Logitech MX Master 3S", categoryId: peripherals.id, departmentId: engineering.id, serial: "LG-MX-1101", cost: 8500, location: "Bengaluru HQ / Floor 3", days: 120 },
    { name: "Logitech MX Master 3S", categoryId: peripherals.id, departmentId: engineering.id, serial: "LG-MX-1102", cost: 8500, location: "Bengaluru HQ / Floor 3", days: 120 },
    { name: "Keychron K2 Keyboard", categoryId: peripherals.id, departmentId: engineering.id, serial: "KC-K2-3301", cost: 7900, location: "Bengaluru HQ / Floor 3", days: 200 },
    { name: "Jabra Evolve2 65 Headset", categoryId: peripherals.id, departmentId: sales.id, serial: "JB-E65-7712", cost: 18500, location: "Pune Office", days: 90 },
    { name: "Jabra Evolve2 65 Headset", categoryId: peripherals.id, departmentId: sales.id, serial: "JB-E65-7713", cost: 18500, location: "Pune Office", days: 90 },
    // Furniture
    { name: "Herman Miller Aeron Chair", categoryId: furniture.id, departmentId: engineering.id, cost: 96000, location: "Bengaluru HQ / Floor 3", days: 700 },
    { name: "Herman Miller Aeron Chair", categoryId: furniture.id, departmentId: engineering.id, cost: 96000, location: "Bengaluru HQ / Floor 3", days: 700 },
    { name: "Standing Desk (Electric)", categoryId: furniture.id, departmentId: engineering.id, cost: 42000, location: "Bengaluru HQ / Floor 3", days: 650 },
    { name: "Standing Desk (Electric)", categoryId: furniture.id, departmentId: it.id, cost: 42000, location: "Bengaluru HQ / Floor 2", days: 650, condition: "fair" },
    { name: "Filing Cabinet", categoryId: furniture.id, departmentId: admin_.id, cost: 14000, location: "Bengaluru HQ / Floor 1", days: 1100, state: "retired", condition: "poor" },
    // Vehicles
    { name: "Toyota Innova Crysta", categoryId: vehicles.id, departmentId: facilities.id, serial: "KA01-MJ-4471", cost: 2150000, location: "Bengaluru HQ / Parking", bookable: true, days: 900 },
    { name: "Maruti Swift Dzire", categoryId: vehicles.id, departmentId: facilities.id, serial: "KA05-HK-9012", cost: 890000, location: "Bengaluru HQ / Parking", bookable: true, days: 1200 },
    { name: "Tata Ace Delivery Van", categoryId: vehicles.id, departmentId: facilities.id, serial: "KA03-AB-2210", cost: 640000, location: "Warehouse", bookable: true, days: 1400 },
    // Meeting rooms — Room B2 is the brief's example. Keep the name.
    { name: "Room B2", categoryId: rooms.id, departmentId: facilities.id, cost: 0, location: "Bengaluru HQ / Floor 2", bookable: true, days: 1500 },
    { name: "Room A1", categoryId: rooms.id, departmentId: facilities.id, cost: 0, location: "Bengaluru HQ / Floor 1", bookable: true, days: 1500 },
    { name: "Conference Hall", categoryId: rooms.id, departmentId: facilities.id, cost: 0, location: "Bengaluru HQ / Floor 1", bookable: true, days: 1500 },
    { name: "Focus Pod 1", categoryId: rooms.id, departmentId: facilities.id, cost: 0, location: "Bengaluru HQ / Floor 3", bookable: true, days: 800 },
    // Tools
    { name: "Bosch Drill Kit", categoryId: tools.id, departmentId: facilities.id, serial: "BSH-DR-0091", cost: 12000, location: "Bengaluru HQ / Store", days: 400 },
    { name: "Aluminium Ladder 8ft", categoryId: tools.id, departmentId: facilities.id, cost: 6500, location: "Bengaluru HQ / Store", days: 600 },
    { name: "Label Printer", categoryId: tools.id, departmentId: it.id, serial: "BRO-QL-820", cost: 21000, location: "Bengaluru HQ / Floor 2", days: 320, state: "lost" },
  ];

  const assets: { id: number; assetTag: string; name: string }[] = [];
  for (const s of specs) {
    const tag = await nextTag();
    const a = await db.assetAsset.create({
      data: {
        name: s.name,
        assetTag: tag,
        categoryId: s.categoryId,
        departmentId: s.departmentId,
        serialNo: s.serial,
        acquisitionDate: daysFromNow(-s.days),
        acquisitionCost: s.cost,
        condition: s.condition ?? "good",
        location: s.location,
        isBookable: s.bookable ?? false,
        state: s.state ?? "available",
        createUid: neha.id,
      },
      select: { id: true, assetTag: true, name: true },
    });
    assets.push(a);
    await db.mailMessage.create({
      data: { model: "asset.asset", resId: a.id, action: "create", authorId: neha.id,
        body: `${tag} — ${s.name} registered.` },
    });
  }
  const byName = (n: string, skip = 0) => assets.filter((a) => a.name === n)[skip];
  console.log(`  ✓ ${assets.length} assets (tags ${assets[0].assetTag} → ${assets.at(-1)!.assetTag})`);

  // ── Allocations ────────────────────────────────────────────────────────────
  async function allocate(assetId: number, holderUserId: number, opts: { since: number; due?: number; by?: number }) {
    const asset = assets.find((a) => a.id === assetId)!;
    const holder = await db.resUsers.findUniqueOrThrow({ where: { id: holderUserId }, select: { name: true } });
    await db.assetAllocation.create({
      data: {
        assetId, holderUserId,
        allocatedDate: daysFromNow(-opts.since),
        expectedReturnDate: opts.due !== undefined ? daysFromNow(opts.due) : null,
        allocatedById: opts.by ?? neha.id,
        state: "active",
      },
    });
    await db.assetAsset.update({ where: { id: assetId }, data: { state: "allocated" } });
    await db.mailMessage.create({
      data: { model: "asset.asset", resId: assetId, action: "allocate", authorId: opts.by ?? neha.id,
        body: `${asset.assetTag} allocated to ${holder.name}.` },
    });
  }

  // ⭐ THE DEMO FIXTURE. Priya holds this MacBook. Allocating it to Raj must be
  //    blocked, must name Priya, and must offer a Transfer Request.
  const priyaLaptop = byName('MacBook Pro 14"');
  await allocate(priyaLaptop.id, priya.id, { since: 40, due: 60 });

  await allocate(byName('MacBook Pro 16"').id, karthik.id, { since: 25, due: 90 });
  await allocate(byName("Lenovo ThinkPad X1").id, ananya.id, { since: 70, due: 120 });
  await allocate(byName("iPhone 15").id, meera.id, { since: 30 }); // no due date
  await allocate(byName("Herman Miller Aeron Chair").id, priya.id, { since: 200 });
  await allocate(byName("Jabra Evolve2 65 Headset").id, meera.id, { since: 15, due: 45 });

  // ⭐ Two OVERDUE allocations — the dashboard must surface these separately.
  await allocate(byName("iPad Pro 11").id, rahul.id, { since: 60, due: -9 });
  await allocate(byName("Dell Latitude 5540").id, raj.id, { since: 50, due: -3 });

  // Closed allocations → per-asset history has depth on day one.
  const returnedChair = byName("Herman Miller Aeron Chair", 1);
  await db.assetAllocation.create({
    data: {
      assetId: returnedChair.id, holderUserId: karthik.id,
      allocatedDate: daysFromNow(-260), expectedReturnDate: daysFromNow(-190),
      returnedDate: daysFromNow(-188), state: "returned",
      checkinCondition: "good", checkinNotes: "Returned in good order. Armrest slightly scuffed.",
      allocatedById: neha.id,
    },
  });
  await db.mailMessage.create({
    data: { model: "asset.asset", resId: returnedChair.id, action: "return", authorId: neha.id,
      body: `${returnedChair.assetTag} returned by Karthik Nair — condition: good.` },
  });

  // A department-held asset (holder is a dept, not a person).
  await db.assetAllocation.create({
    data: { assetId: byName("Bosch Drill Kit").id, holderDeptId: facilities.id,
      allocatedDate: daysFromNow(-120), allocatedById: neha.id, state: "active" },
  });
  await db.assetAsset.update({ where: { id: byName("Bosch Drill Kit").id }, data: { state: "allocated" } });
  console.log("  ✓ 9 allocations (2 overdue, 1 department-held, 1 returned)");

  // ── Bookings ───────────────────────────────────────────────────────────────
  const roomB2 = byName("Room B2");
  const roomA1 = byName("Room A1");
  const hall = byName("Conference Hall");
  const innova = byName("Toyota Innova Crysta");
  const projector = byName("Epson EB-2250U Projector");

  async function book(assetId: number, userId: number, start: Date, end: Date, name: string, state: "confirmed" | "cancelled" = "confirmed") {
    await db.resourceBooking.create({ data: { assetId, userId, startDatetime: start, endDatetime: end, name, state } });
  }

  // ⭐ THE DEMO FIXTURE. Room B2, 09:00–10:00 today.
  //    A request for 09:30–10:30 must be REJECTED (overlaps).
  //    A request for 10:00–11:00 must be ACCEPTED (half-open — touching is fine).
  await book(roomB2.id, ananya.id, todayAt(9), todayAt(10), "Sales pipeline review");

  await book(roomB2.id, sara.id, todayAt(14), todayAt(15, 30), "Engineering sync");
  await book(roomA1.id, vikram.id, todayAt(11), todayAt(12), "IT vendor call");
  await book(roomA1.id, meera.id, todayAt(16), todayAt(17), "Customer demo");
  await book(hall.id, aarav.id, todayAt(10), todayAt(12), "All-hands");
  await book(innova.id, divya.id, todayAt(8), todayAt(13), "Airport pickup — client");
  await book(projector.id, sara.id, todayAt(14), todayAt(16), "Sprint demo");
  await book(roomB2.id, karthik.id, todayAt(11), todayAt(12), "Cancelled standup", "cancelled");

  // A fortnight of history + future, so the heatmap and calendar aren't bare.
  // NB: JS `%` yields negative remainders for negative operands, and `d` runs
  // from -7 — so index with a true modulo, not `%`.
  const pick = <T,>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];

  const hours = [9, 10, 11, 14, 15, 16];
  const resources = [roomB2.id, roomA1.id, hall.id, innova.id, projector.id];
  const people = [priya.id, raj.id, ananya.id, karthik.id, meera.id, rahul.id, divya.id];
  const purposes = ["Team sync", "1:1", "Client call", "Design review", "Retro"];

  let n = 0;
  for (let d = -7; d <= 7; d++) {
    if (d === 0) continue; // today is hand-crafted above — don't collide with it
    const perDay = 2 + (((d % 3) + 3) % 3);
    for (let k = 0; k < perDay; k++) {
      const start = new Date(daysFromNow(d));
      start.setHours(pick(hours, d + k), 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      // Two bookings in this loop could collide on the same resource+slot, which
      // the exclusion constraint would (correctly) reject. Skip those rather
      // than fail the seed — it proves the constraint works, incidentally.
      try {
        await book(pick(resources, d + k), pick(people, d + k), start, end, pick(purposes, d + k));
        n++;
      } catch {
        /* slot already taken — the GiST constraint did its job */
      }
    }
  }
  console.log(`  ✓ ${n + 8} bookings (Room B2 09:00–10:00 today is the demo fixture)`);

  // ── Maintenance ────────────────────────────────────────────────────────────
  const brokenMonitor = byName('Dell UltraSharp 27"', 1); // the one with condition: poor
  const latitude2 = byName("Dell Latitude 5540", 1);

  // 1. Pending — awaiting approval. Asset is UNTOUCHED (still available). This is
  //    the whole point of the approval gate: raising a request changes nothing.
  await db.maintenanceRequest.create({
    data: { name: "MR-0001", assetId: latitude2.id, requestedById: rahul.id, priority: "medium",
      description: "Battery drains within 40 minutes. Needs replacement.", state: "pending" },
  });
  await db.mailNotification.createMany({
    data: [aarav.id, neha.id, vikram.id].map((userId) => ({
      userId, type: "maintenance_requested" as const, title: "Maintenance request raised",
      body: `${latitude2.assetTag} — battery drains within 40 minutes.`, actionUrl: "/maintenance",
    })),
  });

  // 2. In progress — approved, so the asset IS under_maintenance.
  await db.maintenanceRequest.create({
    data: { name: "MR-0002", assetId: brokenMonitor.id, requestedById: karthik.id, priority: "high",
      description: "Flickering at 60Hz; vertical line down the left third of the panel.",
      state: "in_progress", approverId: neha.id, approvedDate: daysFromNow(-4),
      technicianId: imran.id, startedDate: daysFromNow(-2) },
  });
  await db.assetAsset.update({ where: { id: brokenMonitor.id }, data: { state: "under_maintenance" } });
  await db.mailMessage.create({
    data: { model: "asset.asset", resId: brokenMonitor.id, action: "approve_maintenance", authorId: neha.id,
      body: `${brokenMonitor.assetTag} sent for repair — maintenance approved.` },
  });

  // 3. Resolved — history.
  await db.maintenanceRequest.create({
    data: { name: "MR-0003", assetId: byName("Toyota Innova Crysta").id, requestedById: divya.id, priority: "urgent",
      description: "Brake pads worn; scheduled service overdue.", state: "resolved",
      approverId: neha.id, approvedDate: daysFromNow(-30), technicianId: imran.id,
      startedDate: daysFromNow(-28), resolvedDate: daysFromNow(-26),
      resolutionNotes: "Brake pads and discs replaced. Full service completed.", repairCost: 18400 },
  });
  await db.irSequence.update({ where: { code: "maintenance.request" }, data: { numberNext: 4 } });
  console.log("  ✓ 3 maintenance requests (1 pending, 1 in progress, 1 resolved)");

  // ── Audit cycle ────────────────────────────────────────────────────────────
  const cycle = await db.auditCycle.create({
    data: { name: "AUD-001 — Q3 Engineering Floor Audit", scopeDepartmentId: engineering.id,
      dateStart: daysFromNow(-3), dateEnd: daysFromNow(11), state: "in_progress", createUid: aarav.id },
  });
  await db.auditCycleAuditor.createMany({
    data: [{ auditCycleId: cycle.id, userId: karthik.id }, { auditCycleId: cycle.id, userId: divya.id }],
  });

  const engAssets = await db.assetAsset.findMany({ where: { departmentId: engineering.id }, select: { id: true } });
  await db.auditLine.createMany({
    data: engAssets.map((a, i) => ({
      auditCycleId: cycle.id, assetId: a.id,
      // Leave most PENDING so the demo has something to actually do live.
      result: (i === 0 ? "verified" : i === 1 ? "damaged" : "pending") as "verified" | "damaged" | "pending",
      auditorId: i < 2 ? karthik.id : null,
      verifiedDate: i < 2 ? daysFromNow(-1) : null,
      notes: i === 1 ? "Casing cracked along the hinge." : null,
    })),
  });
  await db.irSequence.update({ where: { code: "audit.cycle" }, data: { numberNext: 2 } });
  await db.mailNotification.createMany({
    data: [karthik.id, divya.id].map((userId) => ({
      userId, type: "audit_assigned" as const, title: "You've been assigned to an audit",
      body: "Q3 Engineering Floor Audit — 9 assets to verify.", actionUrl: `/audits/${cycle.id}`,
    })),
  });
  console.log(`  ✓ 1 audit cycle in progress (${engAssets.length} lines, 2 auditors)`);

  // ── Notifications for the overdue holders ──────────────────────────────────
  await db.mailNotification.createMany({
    data: [
      { userId: rahul.id, type: "overdue_return", title: "Overdue return", body: `${byName("iPad Pro 11").assetTag} was due 9 days ago.`, actionUrl: "/allocations" },
      { userId: raj.id, type: "overdue_return", title: "Overdue return", body: `${byName("Dell Latitude 5540").assetTag} was due 3 days ago.`, actionUrl: "/allocations" },
      { userId: priya.id, type: "asset_assigned", title: "Asset assigned to you", body: `${priyaLaptop.assetTag} — MacBook Pro 14".`, actionUrl: `/assets/${priyaLaptop.id}` },
    ],
  });

  console.log(`
╭──────────────────────────────────────────────────────────────╮
│  ✅  Seed complete.  Password for every account: ${PASSWORD.padEnd(12)}│
├──────────────────────────────────────────────────────────────┤
│  admin@assetflow.io      Aarav Mehta      Admin              │
│  manager@assetflow.io    Neha Kulkarni    Asset Manager      │
│  vikram@assetflow.io     Vikram Rao       Dept Head (IT)     │
│  priya@assetflow.io      Priya Sharma     Employee           │
│  raj@assetflow.io        Raj Malhotra     Employee           │
├──────────────────────────────────────────────────────────────┤
│  DEMO FIXTURES                                               │
│  • Priya holds ${priyaLaptop.assetTag} (MacBook Pro 14") → allocating it     │
│    to Raj must be BLOCKED + offer Transfer.                  │
│  • Room B2 booked 09:00–10:00 today → 09:30–10:30 must be    │
│    REJECTED; 10:00–11:00 must be ACCEPTED.                   │
╰──────────────────────────────────────────────────────────────╯`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
