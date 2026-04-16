import { jest } from "@jest/globals";

// ── Mock Stripe before importing router ──────────────────────────────────────
const mockCreate          = jest.fn();
const mockRetrieve        = jest.fn();
const mockConstructEvent  = jest.fn();

jest.unstable_mockModule("stripe", () => ({
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockCreate, retrieve: mockRetrieve },
    webhooks:       { constructEvent: mockConstructEvent },
  })),
}));

// ── Mock DB ──────────────────────────────────────────────────────────────────
const mockQuery       = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease     = jest.fn();
const mockConnect     = jest.fn();

jest.unstable_mockModule("../src/db.js", () => ({
  default: { query: mockQuery, connect: mockConnect },
}));

const { default: express }      = await import("express");
const { default: request }      = await import("supertest");
const { default: investRouter } = await import("../src/routes/invest.js");

const app = express();
app.use(express.json());
app.use("/api/invest", investRouter);

const herdRow = {
  herd_id: "herd-1", herd_name: "Test Herd", listing_price: "10000",
  purchase_status: "available", head_count: "50", verified_flag: true,
  dominant_stage: "FEEDLOT", breed_code: "AN", risk_score: 45,
  tokens_sold: "5", investor_pct: "60", feedlot_status: "listed",
  total_supply: "20", contract_address: "0xABC",
};

function setupClientMock() {
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
}

// ─── GET /api/invest/:herdId ──────────────────────────────────────────────────
describe("GET /api/invest/:herdId", () => {
  beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); });

  test("404 when herd not found or not listed", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/invest/herd-999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("200 returns herd invest info with computed fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [herdRow] });
    const res = await request(app).get("/api/invest/herd-1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      herdId: "herd-1",
      herdName: "Test Herd",
      totalSupply: 20,
    });
    // investorAllocation = floor(20 * 60/100) = 12; tokensSold = 5; tokensAvailable = 7
    expect(res.body.investorAllocation).toBe(12);
    expect(res.body.tokensAvailable).toBe(7);
    expect(res.body.isAvailable).toBe(true);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/invest/herd-1");
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/invest/create-payment-intent ───────────────────────────────────
describe("POST /api/invest/create-payment-intent", () => {
  beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); mockCreate.mockReset(); });

  const valid = { herdId: "herd-1", investorSlug: "investor1", tokensToBuy: 3 };

  test("400 when required fields missing", async () => {
    const res = await request(app).post("/api/invest/create-payment-intent").send({ herdId: "h1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("400 when tokensToBuy < 1", async () => {
    const res = await request(app).post("/api/invest/create-payment-intent").send({ ...valid, tokensToBuy: 0 });
    expect(res.status).toBe(400);
  });

  test("404 when herd not found or not listed", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/invest/create-payment-intent").send(valid);
    expect(res.status).toBe(404);
  });

  test("409 when not enough tokens remaining", async () => {
    // investorAllocation=12, tokens_sold=10 → remaining=2; tokensToBuy=5
    const row = { ...herdRow, tokens_sold: "10" };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).post("/api/invest/create-payment-intent").send({ ...valid, tokensToBuy: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/tokens remaining/i);
  });

  test("404 when investor not found", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [herdRow] })  // herd ok
      .mockResolvedValueOnce({ rows: [] });         // investor not found
    const res = await request(app).post("/api/invest/create-payment-intent").send(valid);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/investor not found/i);
  });

  test("200 creates Stripe payment intent", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [herdRow] })                 // herd ok
      .mockResolvedValueOnce({ rows: [{ user_id: 7 }] });        // investor ok

    mockCreate.mockResolvedValueOnce({
      client_secret: "pi_secret_123",
      id: "pi_123",
    });

    const res = await request(app).post("/api/invest/create-payment-intent").send(valid);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clientSecret: "pi_secret_123",
      paymentIntentId: "pi_123",
    });
    expect(typeof res.body.amountUsd).toBe("number");
    expect(res.body.totalCents).toBeGreaterThan(0);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).post("/api/invest/create-payment-intent").send(valid);
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/invest/confirm ─────────────────────────────────────────────────
describe("POST /api/invest/confirm", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockRetrieve.mockReset();
  });

  test("400 when paymentIntentId missing", async () => {
    const res = await request(app).post("/api/invest/confirm").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/paymentIntentId is required/i);
  });

  test("402 when payment not confirmed by Stripe", async () => {
    mockRetrieve.mockResolvedValueOnce({ status: "requires_payment_method", metadata: {} });
    const res = await request(app).post("/api/invest/confirm").send({ paymentIntentId: "pi_123" });
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/payment not confirmed/i);
  });

  test("200 on successful confirmation records investment", async () => {
    setupClientMock();
    mockRetrieve.mockResolvedValueOnce({
      status: "succeeded",
      metadata: { herdId: "herd-1", investorSlug: "investor1", tokensToBuy: "3", herdName: "Test Herd" },
    });

    // recordInvestment calls (client.query):
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })   // BEGIN
      .mockResolvedValueOnce({               // herd lock
        rows: [{ herd_id: "herd-1", purchase_status: "available", tokens_sold: "5", investor_pct: "60", pool_id: "pool-1", total_supply: "20" }],
      })
      .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })  // investor lookup
      .mockResolvedValueOnce({ rows: [] })   // ownership upsert
      .mockResolvedValueOnce({ rows: [] })   // transaction insert
      .mockResolvedValueOnce({ rows: [] })   // update tokens_sold
      .mockResolvedValueOnce({ rows: [] });  // COMMIT

    const res = await request(app).post("/api/invest/confirm").send({ paymentIntentId: "pi_123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/successfully purchased/i);
  });

  test("500 on Stripe error", async () => {
    mockRetrieve.mockRejectedValueOnce(new Error("Stripe down"));
    const res = await request(app).post("/api/invest/confirm").send({ paymentIntentId: "pi_999" });
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/invest/webhook ─────────────────────────────────────────────────
describe("POST /api/invest/webhook", () => {
  beforeEach(() => {
    mockConstructEvent.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
  });

  test("500 when STRIPE_WEBHOOK_SECRET not configured", async () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await request(app)
      .post("/api/invest/webhook")
      .set("stripe-signature", "sig123")
      .send(Buffer.from("{}"));
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/webhook secret not configured/i);
    process.env.STRIPE_WEBHOOK_SECRET = original;
  });

  test("400 when signature verification fails", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockConstructEvent.mockImplementationOnce(() => { throw new Error("Bad sig"); });
    const res = await request(app)
      .post("/api/invest/webhook")
      .set("stripe-signature", "bad_sig")
      .set("content-type", "application/json")
      .send(Buffer.from("{}"));
    expect(res.status).toBe(400);
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  test("200 for non-payment_intent.succeeded events (no-op)", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockConstructEvent.mockReturnValueOnce({ type: "customer.created", data: { object: {} } });
    const res = await request(app)
      .post("/api/invest/webhook")
      .set("stripe-signature", "sig123")
      .set("content-type", "application/json")
      .send(Buffer.from("{}"));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});
