import { jest } from "@jest/globals";

const mockQuery       = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease     = jest.fn();
const mockConnect     = jest.fn();

jest.unstable_mockModule("../src/db.js", () => ({
  default: { query: mockQuery, connect: mockConnect },
}));

const { default: express }     = await import("express");
const { default: request }     = await import("supertest");
const { default: herdsRouter } = await import("../src/routes/herds.js");

const app = express();
app.use(express.json());
app.use("/api/herds", herdsRouter);

const VALID_UUID = "00000000-0000-1000-8000-000000000001";
const HERD_ID   = "aaaaaaaa-0000-1000-8000-000000000001";

const herdRow = {
  herd_id: HERD_ID, rancher_id: VALID_UUID, herd_name: "Test Herd",
  cohort_label: null, breed_code: "AN", season: "Fall",
  dominant_stage: "RANCH", head_count: 30, listing_price: "5000",
  purchase_status: "available", feedlot_status: "pending",
  investor_pct: null, verified_flag: false,
  last_updated: new Date().toISOString(), created_at: new Date().toISOString(),
  cattle_count: 5,
};

function setupClient() {
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
}

// ─── GET /api/herds ───────────────────────────────────────────────────────────
describe("GET /api/herds", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("200 returns paginated herds", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [herdRow] });
    const res = await request(app).get("/api/herds");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].herd_name).toBe("Test Herd");
  });

  test("200 filters by rancherId query param", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get(`/api/herds?rancherId=${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toContain(VALID_UUID);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/herds");
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/herds/:herdId ───────────────────────────────────────────────────
describe("GET /api/herds/:herdId", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("404 when herd not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get(`/api/herds/${HERD_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/herd not found/i);
  });

  test("200 returns herd", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [herdRow] });
    const res = await request(app).get(`/api/herds/${HERD_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.herd_name).toBe("Test Herd");
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get(`/api/herds/${HERD_ID}`);
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/herds ──────────────────────────────────────────────────────────
describe("POST /api/herds", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  const validBody = { herdName: "New Herd", headCount: 25, season: "Fall" };

  test("400 when rancher ID missing entirely", async () => {
    const res = await request(app).post("/api/herds").send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing rancher id/i);
  });

  test("400 when rancher ID is invalid UUID", async () => {
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", "not-a-uuid")
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid rancher id format/i);
  });

  test("400 when herdName missing", async () => {
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send({ headCount: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing herdname/i);
  });

  test("400 when headCount below 20", async () => {
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send({ herdName: "Test", headCount: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/headCount/i);
  });

  test("400 for invalid season", async () => {
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send({ herdName: "Test", headCount: 25, season: "Winter" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid season/i);
  });

  test("404 when rancher user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rancher not found/i);
  });

  test("403 when user is an investor", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 1, role: "investor" }] });
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/investor/i);
  });

  test("201 successfully creates herd", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 1, role: "rancher" }] }) // rancher check
      .mockResolvedValueOnce({ rowCount: 1, rows: [herdRow] });                         // INSERT

    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/created successfully/i);
    expect(res.body.herd).toBeDefined();
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .post("/api/herds")
      .set("x-rancher-id", VALID_UUID)
      .send(validBody);
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/herds/:herdId/list ─────────────────────────────────────────────
describe("POST /api/herds/:herdId/list", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("200 lists herd", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [herdRow] });
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/list`)
      .set("x-rancher-id", VALID_UUID)
      .send({ listingPrice: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/listed successfully/i);
  });

  test("404 when herd not found", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })   // UPDATE → no match
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });  // herd existence check

    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/list`)
      .set("x-rancher-id", VALID_UUID)
      .send({});
    expect(res.status).toBe(404);
  });

  test("400 for negative listingPrice", async () => {
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/list`)
      .set("x-rancher-id", VALID_UUID)
      .send({ listingPrice: -100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/listingPrice cannot be negative/i);
  });
});

// ─── POST /api/herds/:herdId/publish ─────────────────────────────────────────
describe("POST /api/herds/:herdId/publish", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("200 publishes herd", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [herdRow] });
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/publish`)
      .set("x-rancher-id", VALID_UUID)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/published successfully/i);
  });

  test("404 when herd not found", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/publish`)
      .send({});
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/herds/:herdId/move ───────────────────────────────────────────
describe("PATCH /api/herds/:herdId/move", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("400 when no toStatus or direction provided", async () => {
    const res = await request(app).patch(`/api/herds/${HERD_ID}/move`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/provide toStatus/i);
  });

  test("404 when herd not found", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .patch(`/api/herds/${HERD_ID}/move`)
      .send({ toStatus: "sold" });
    expect(res.status).toBe(404);
  });

  test("400 when herd is already at final status and direction=next", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: null, purchase_status: "sold" }] });
    const res = await request(app)
      .patch(`/api/herds/${HERD_ID}/move`)
      .send({ direction: "next" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/final status/i);
  });

  test("400 when herd is already at first status and direction=previous", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: null, purchase_status: "available" }] });
    const res = await request(app)
      .patch(`/api/herds/${HERD_ID}/move`)
      .send({ direction: "previous" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/first status/i);
  });

  test("200 moves herd to next status by direction", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: null, purchase_status: "available" }] }) // SELECT
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ ...herdRow, purchase_status: "pending" }] }); // UPDATE
    const res = await request(app)
      .patch(`/api/herds/${HERD_ID}/move`)
      .send({ direction: "next" });
    expect(res.status).toBe(200);
    expect(res.body.fromStatus).toBe("available");
    expect(res.body.toStatus).toBe("pending");
  });

  test("200 moves herd to explicit toStatus", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: null, purchase_status: "available" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ ...herdRow, purchase_status: "sold" }] });
    const res = await request(app)
      .patch(`/api/herds/${HERD_ID}/move`)
      .send({ toStatus: "sold" });
    expect(res.status).toBe(200);
    expect(res.body.toStatus).toBe("sold");
  });
});

// ─── GET /api/herds/:herdId/cattle ───────────────────────────────────────────
describe("GET /api/herds/:herdId/cattle", () => {
  beforeEach(() => { mockQuery.mockReset(); });

  test("200 returns cattle list", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { cow_id: 1, herd_id: HERD_ID, animal_name: "Bessie", breed_code: "AN", sex_code: "C", created_at: new Date() },
        { cow_id: 2, herd_id: HERD_ID, animal_name: "Daisy",  breed_code: "HH", sex_code: "H", created_at: new Date() },
      ],
    });
    const res = await request(app).get(`/api/herds/${HERD_ID}/cattle`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items).toHaveLength(2);
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get(`/api/herds/${HERD_ID}/cattle`);
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/herds/:herdId/cattle ──────────────────────────────────────────
describe("POST /api/herds/:herdId/cattle", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    setupClient();
  });

  const validCow = { officialId: "TAG-001", breedCode: "AN", sexCode: "B", weightLbs: 700 };

  test("400 when no identifier provided", async () => {
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle`)
      .send({ breedCode: "AN" }); // missing officialId and registrationNumber
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing cow identifier/i);
  });

  test("400 for invalid sexCode", async () => {
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle`)
      .send({ officialId: "TAG-001", sexCode: "Z" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid sexcode/i);
  });

  test("404 when herd not found", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })     // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // ensureHerdAccess → not found
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // exists check
      .mockResolvedValueOnce({ rows: [] });    // ROLLBACK

    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle`)
      .send(validCow);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/herd not found/i);
  });

  test("201 creates cow successfully", async () => {
    const cowDbRow = { animal_id: 42, herd_id: HERD_ID, official_id: "TAG-001" };
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                              // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: VALID_UUID }] }) // herd access ok
      .mockResolvedValueOnce({ rowCount: 1, rows: [cowDbRow] })         // INSERT animal
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ weight_id: 1 }] }) // INSERT weight
      .mockResolvedValueOnce({ rows: [] })                              // refreshHerdCounts
      .mockResolvedValueOnce({ rows: [] });                             // COMMIT

    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle`)
      .set("x-rancher-id", VALID_UUID)
      .send(validCow);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/cow created successfully/i);
  });
});

// ─── POST /api/herds/:herdId/cattle/bulk ─────────────────────────────────────
describe("POST /api/herds/:herdId/cattle/bulk", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    setupClient();
  });

  test("400 when cattle array is empty or missing", async () => {
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle/bulk`)
      .send({ cattle: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty cattle array/i);
  });

  test("400 when a cow fails validation", async () => {
    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle/bulk`)
      .send({ cattle: [{ sexCode: "Z" }] }); // invalid sexCode, no identifier
    expect(res.status).toBe(400);
  });

  test("201 bulk creates cattle", async () => {
    const cowDbRow = { animal_id: 99, herd_id: HERD_ID };
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                              // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID, rancher_id: VALID_UUID }] }) // access
      .mockResolvedValueOnce({ rowCount: 1, rows: [cowDbRow] })         // INSERT animal
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ weight_id: 1 }] }) // INSERT weight
      .mockResolvedValueOnce({ rows: [] })                              // refreshHerdCounts
      .mockResolvedValueOnce({ rows: [] });                             // COMMIT

    const res = await request(app)
      .post(`/api/herds/${HERD_ID}/cattle/bulk`)
      .set("x-rancher-id", VALID_UUID)
      .send({ cattle: [{ officialId: "TAG-001", weightLbs: 700 }] });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });
});

// ─── DELETE /api/herds/:herdId/cattle/:cowId ─────────────────────────────────
describe("DELETE /api/herds/:herdId/cattle/:cowId", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    setupClient();
  });

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).delete(`/api/herds/${HERD_ID}/cattle/abc`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cowid/i);
  });

  test("404 when cow not found in herd", async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                              // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID }] }) // access ok
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })                 // animal update → not found
      .mockResolvedValueOnce({ rows: [] });                             // ROLLBACK

    const res = await request(app).delete(`/api/herds/${HERD_ID}/cattle/999`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/cow not found in this herd/i);
  });

  test("200 removes cow from herd", async () => {
    const cowRow = { animal_id: 5, herd_id: null };
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })                              // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ herd_id: HERD_ID }] }) // access ok
      .mockResolvedValueOnce({ rowCount: 1, rows: [cowRow] })           // animal update
      .mockResolvedValueOnce({ rows: [] })                              // refreshHerdCounts
      .mockResolvedValueOnce({ rows: [] });                             // COMMIT

    const res = await request(app).delete(`/api/herds/${HERD_ID}/cattle/5`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed from herd/i);
  });
});
