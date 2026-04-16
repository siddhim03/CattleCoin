import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }         = await import("express");
const { default: request }         = await import("supertest");
const { default: investorsRouter } = await import("../src/routes/investors.js");

const app = express();
app.use(express.json());
app.use("/api/investors", investorsRouter);

const herdRow = {
  herd_id: "herd-1", rancher_id: "r1", herd_name: "Test Herd",
  listing_price: "10000", purchase_status: "available", head_count: "40",
  verified_flag: true, last_updated: new Date().toISOString(), cohort_label: null,
  season: "Fall", breed_code: "AN", dominant_stage: "RANCH", risk_score: 55,
  pool_id: "pool-1", total_supply: "20", contract_address: "",
  token_amount: "5", position_value_usd: "12500",
};

// ─── GET /api/investors/:slug/portfolio ───────────────────────────────────────
describe("GET /api/investors/:slug/portfolio", () => {
  beforeEach(() => mockQuery.mockReset());

  test("404 when investor slug not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/investors/ghost/portfolio");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("200 returns full portfolio when investor has herds", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 7, email: "i@test.com" }] })    // user lookup
      .mockResolvedValueOnce({ rows: [herdRow] })                                 // herds
      .mockResolvedValueOnce({ rows: [] });                                       // recent events

    const res = await request(app).get("/api/investors/investor1/portfolio");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      investorSlug: "investor1",
      poolsHeld: 1,
    });
    expect(res.body.history30d).toHaveLength(31);
    expect(res.body.topPools).toHaveLength(1);
  });

  test("200 returns empty portfolio when investor holds no herds", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 7, email: "i@test.com" }] })  // user
      .mockResolvedValueOnce({ rows: [] });                                      // no herds (events query skipped)

    const res = await request(app).get("/api/investors/investor1/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.poolsHeld).toBe(0);
    expect(res.body.portfolioValueUsd).toBe(0);
  });

  test("avgRisk is 55 fallback when investor holds no pools", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 7, email: "i@test.com" }] })
      .mockResolvedValueOnce({ rows: [] }); // no herds → pools.length === 0

    const res = await request(app).get("/api/investors/investor1/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.avgRisk).toBe(55);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/investors/investor1/portfolio");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch investor portfolio/i);
  });
});

// ─── GET /api/investors/:slug/holdings ────────────────────────────────────────
describe("GET /api/investors/:slug/holdings", () => {
  beforeEach(() => mockQuery.mockReset());

  test("404 when investor not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/investors/ghost/holdings");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/investor not found/i);
  });

  test("200 returns held pools", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 9 }] })
      .mockResolvedValueOnce({
        rows: [{
          herd_id: "h1", herd_name: "Alpha Herd", listing_price: "8000",
          purchase_status: "available", head_count: "25", verified_flag: true,
          last_updated: new Date().toISOString(), cohort_label: null, season: "Spring",
          breed_code: "HH", dominant_stage: "BACKGROUNDING", risk_score: 40,
          pool_id: "p1", total_supply: "20", contract_address: "",
          token_amount: "3",
        }],
      });

    const res = await request(app).get("/api/investors/investor2/holdings");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({
      herdId: "h1",
      name: "Alpha Herd",
      tokenAmount: 3,
    });
  });

  test("200 returns empty array when no holdings", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 9 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/investors/investor2/holdings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/investors/investor2/holdings");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch holdings/i);
  });
});
