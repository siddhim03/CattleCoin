import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }         = await import("express");
const { default: request }         = await import("supertest");
const { default: portfolioRouter } = await import("../src/routes/portfolio.js");

const app = express();
app.use(express.json());
app.use("/api/portfolio", portfolioRouter);

// Minimal herd row the route accepts
const herdRow = {
  herd_id: "herd-1", rancher_id: "r1", herd_name: "Test Herd",
  listing_price: "10000", purchase_status: "available",
  head_count: "50", verified_flag: true, last_updated: new Date().toISOString(),
  cohort_label: null, season: "Fall", breed_code: "AN", dominant_stage: "RANCH",
  pool_id: "pool-1", total_supply: "20", contract_address: "",
  position_value_usd: "12500",
};

describe("GET /api/portfolio", () => {
  beforeEach(() => mockQuery.mockReset());

  test("200 when no ownership records exist (3 queries)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })            // ownership check
      .mockResolvedValueOnce({ rows: [herdRow] })                    // herds (no filter)
      .mockResolvedValueOnce({ rows: [] });                          // events

    const res = await request(app).get("/api/portfolio");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("portfolioValueUsd");
    expect(res.body).toHaveProperty("history30d");
    expect(res.body.history30d).toHaveLength(31);
    expect(res.body.poolsHeld).toBe(1);
  });

  test("200 when ownership records exist (4 queries)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "5" }] })             // ownership check
      .mockResolvedValueOnce({ rows: [herdRow] })                    // herds (investor-scoped)
      .mockResolvedValueOnce({ rows: [{ herd_id: "herd-1", total_tokens: 10 }] }) // token amounts
      .mockResolvedValueOnce({ rows: [] });                          // events

    const res = await request(app).get("/api/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.poolsHeld).toBe(1);
    expect(res.body).toHaveProperty("recentEvents");
    expect(res.body).toHaveProperty("topPools");
  });

  test("200 with no herds returns empty portfolio", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.portfolioValueUsd).toBe(0);
    expect(res.body.poolsHeld).toBe(0);
  });

  test("200 maps recentEvents correctly", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [herdRow] })
      .mockResolvedValueOnce({
        rows: [{
          id: "ev-1", pool_id: "herd-1", cow_id: "42",
          stage: "RANCH", verified: true,
          timestamp_iso: new Date().toISOString(),
          note: "BRD vaccine administered",
        }],
      });

    const res = await request(app).get("/api/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.recentEvents).toHaveLength(1);
    expect(res.body.recentEvents[0].note).toBe("BRD vaccine administered");
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/portfolio");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch portfolio/i);
  });
});
