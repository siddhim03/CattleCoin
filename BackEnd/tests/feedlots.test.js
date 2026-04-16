import { jest } from "@jest/globals";

const mockQuery    = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease  = jest.fn();
const mockConnect  = jest.fn();

jest.unstable_mockModule("../src/db.js", () => ({
  default: { query: mockQuery, connect: mockConnect },
}));

const { default: express }        = await import("express");
const { default: request }        = await import("supertest");
const { default: feedlotsRouter } = await import("../src/routes/feedlots.js");

const app = express();
app.use(express.json());
app.use("/api/feedlot", feedlotsRouter);

const pendingHerdRow = {
  herd_id: "h1", rancher_id: "r1", herd_name: "Test Herd",
  listing_price: "5000", head_count: "30", verified_flag: false,
  breed_code: "AN", dominant_stage: "RANCH", season: "Fall",
  risk_score: 45, feedlot_status: "pending", investor_pct: null,
  created_at: new Date().toISOString(),
};

// ─── GET /api/feedlot/pending ─────────────────────────────────────────────────
describe("GET /api/feedlot/pending", () => {
  beforeEach(() => mockQuery.mockReset());

  test("200 returns shaped pending herds", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [pendingHerdRow] });
    const res = await request(app).get("/api/feedlot/pending");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({
      herdId:       "h1",
      feedlotStatus:"pending",
      breedCode:    "AN",
    });
  });

  test("200 returns empty array when no pending herds", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/feedlot/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/feedlot/pending");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch pending herds/i);
  });
});

// ─── GET /api/feedlot/:slug/dashboard ────────────────────────────────────────
describe("GET /api/feedlot/:slug/dashboard", () => {
  beforeEach(() => mockQuery.mockReset());

  test("404 when feedlot user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/feedlot/ghost/dashboard");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("200 returns claimed herds", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 99 }] })   // user lookup
      .mockResolvedValueOnce({
        rows: [{
          ...pendingHerdRow,
          feedlot_status: "listed",
          tokens_sold: "5",
          total_supply: "20",
          investor_tokens_sold: 5,
        }],
      });                                                    // herds query

    const res = await request(app).get("/api/feedlot/feedlot1/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("feedlotSlug", "feedlot1");
    expect(res.body.claimedHerds).toHaveLength(1);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/feedlot/fl1/dashboard");
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/feedlot/claim ──────────────────────────────────────────────────
describe("POST /api/feedlot/claim", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
  });

  const valid = { feedlotSlug: "fl1", herdId: "h1", investorPct: 60 };

  test("400 when required fields missing", async () => {
    const res = await request(app).post("/api/feedlot/claim").send({ feedlotSlug: "fl1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("400 when investorPct out of range", async () => {
    const res = await request(app).post("/api/feedlot/claim").send({ ...valid, investorPct: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/investorPct/i);
  });

  test("400 when investorPct > 100", async () => {
    const res = await request(app).post("/api/feedlot/claim").send({ ...valid, investorPct: 101 });
    expect(res.status).toBe(400);
  });

  test("404 when herd not found", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] });  // herd lock query → not found
    const res = await request(app).post("/api/feedlot/claim").send(valid);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/herd not found/i);
  });

  test("409 when herd already claimed", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                                // BEGIN
      .mockResolvedValueOnce({ rows: [{ herd_id: "h1", feedlot_status: "listed" }] }); // herd already listed
    const res = await request(app).post("/api/feedlot/claim").send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already claimed/i);
  });

  test("404 when feedlot user not found", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                                          // BEGIN
      .mockResolvedValueOnce({ rows: [{ herd_id: "h1", feedlot_status: "pending" }] }) // herd ok
      .mockResolvedValueOnce({ rows: [] });                                         // feedlot user not found
    const res = await request(app).post("/api/feedlot/claim").send(valid);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/feedlot user not found/i);
  });

  test("200 successful claim", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                                          // BEGIN
      .mockResolvedValueOnce({ rows: [{ herd_id: "h1", feedlot_status: "pending" }] }) // herd ok
      .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })                           // feedlot user
      .mockResolvedValueOnce({
        rows: [{ herd_id: "h1", herd_name: "Test Herd", feedlot_status: "listed", investor_pct: "60" }],
      })                                                                             // UPDATE
      .mockResolvedValueOnce({ rows: [] });                                         // COMMIT
    const res = await request(app).post("/api/feedlot/claim").send(valid);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.investorPct).toBe(60);
  });
});
