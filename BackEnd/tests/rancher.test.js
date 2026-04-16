import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }       = await import("express");
const { default: request }       = await import("supertest");
const { default: rancherRouter } = await import("../src/routes/rancher.js");

const app = express();
app.use(express.json());
app.use("/api/rancher", rancherRouter);

const VALID_UUID = "00000000-0000-1000-8000-000000000001";

// ─── GET /api/rancher/me/herds ────────────────────────────────────────────────
describe("GET /api/rancher/me/herds", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 when x-rancher-id header missing", async () => {
    const res = await request(app).get("/api/rancher/me/herds");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing rancher id/i);
  });

  test("400 for invalid UUID format", async () => {
    const res = await request(app).get("/api/rancher/me/herds").set("x-rancher-id", "not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid rancher id format/i);
  });

  test("400 for invalid status filter", async () => {
    const res = await request(app)
      .get("/api/rancher/me/herds?status=cancelled")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status filter/i);
  });

  test("200 returns herds list", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ herd_id: "h1", herd_name: "My Herd", cattle_count: 5 }],
    });
    const res = await request(app)
      .get("/api/rancher/me/herds")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("200 with status filter passes it to query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/api/rancher/me/herds?status=available")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toContain("available");
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .get("/api/rancher/me/herds")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/rancher/me/summary ─────────────────────────────────────────────
describe("GET /api/rancher/me/summary", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 when rancher ID missing", async () => {
    const res = await request(app).get("/api/rancher/me/summary");
    expect(res.status).toBe(400);
  });

  test("200 returns summary stats", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ herd_count: 3, total_listing_price: 30000 }] })   // herdStats (parallel 1)
      .mockResolvedValueOnce({ rows: [{ cattle_count: 90, on_track_count: 70, watch_count: 15, no_record_count: 5 }] }); // cattleHealthStats (parallel 2)

    const res = await request(app)
      .get("/api/rancher/me/summary")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      rancherId: VALID_UUID,
      herds: 3,
      cattle: 90,
    });
    expect(res.body.health).toMatchObject({ onTrack: 70, watch: 15, noRecord: 5 });
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .get("/api/rancher/me/summary")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/rancher/me/status-board ────────────────────────────────────────
describe("GET /api/rancher/me/status-board", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 when rancher ID missing", async () => {
    const res = await request(app).get("/api/rancher/me/status-board");
    expect(res.status).toBe(400);
  });

  test("200 returns all three statuses with zero-fill for missing", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { purchase_status: "available", herd_count: 2, head_count: 40, total_listing_price: "20000" },
      ],
    });
    const res = await request(app)
      .get("/api/rancher/me/status-board")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(200);
    expect(res.body.byStatus).toHaveLength(3); // available, pending, sold
    const avail = res.body.byStatus.find((s) => s.status === "available");
    const pending = res.body.byStatus.find((s) => s.status === "pending");
    expect(avail.herds).toBe(2);
    expect(pending.herds).toBe(0); // zero-filled
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .get("/api/rancher/me/status-board")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/rancher/me/investments ─────────────────────────────────────────
describe("GET /api/rancher/me/investments", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 when rancher ID missing", async () => {
    const res = await request(app).get("/api/rancher/me/investments");
    expect(res.status).toBe(400);
  });

  test("200 returns investment totals and items", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        herd_id: "h1", herd_name: "Herd A", purchase_status: "available",
        listing_price: "10000", head_count: 30, pool_id: "p1", total_supply: "20",
        tokens_sold: "5", investor_count: 3,
        last_updated: new Date(), created_at: new Date(),
      }],
    });
    const res = await request(app)
      .get("/api/rancher/me/investments")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totals");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].fundedPercent).toBeCloseTo(25, 0); // 5/20 = 25%
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .get("/api/rancher/me/investments")
      .set("x-rancher-id", VALID_UUID);
    expect(res.status).toBe(500);
  });
});
