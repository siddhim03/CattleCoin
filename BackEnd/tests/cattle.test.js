import { jest } from "@jest/globals";

// ── Mock pool BEFORE importing the router ────────────────────────────────────
const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }       = await import("express");
const { default: request }       = await import("supertest");
const { default: cattleRouter }  = await import("../src/routes/cattle.js");

const app = express();
app.use(express.json());
app.use("/api/cattle", cattleRouter);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cattle/:cowId/weights
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/cattle/:cowId/weights", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).get("/api/cattle/abc/weights");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cowid/i);
  });

  test("200 returns weights array", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { weight_id: 1, cow_id: 5, weight_date: "2024-01-01", weight_lbs: 700, weight_type: "arrival", location_code: "LOT1", created_at: new Date() },
        { weight_id: 2, cow_id: 5, weight_date: "2024-02-01", weight_lbs: 780, weight_type: "sale", location_code: "LOT1", created_at: new Date() },
      ],
    });
    const res = await request(app).get("/api/cattle/5/weights");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.cowId).toBe("5");
  });

  test("200 returns empty array when cow has no weights", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get("/api/cattle/99/weights");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.items).toEqual([]);
  });

  test("500 on db error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).get("/api/cattle/5/weights");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch cow weights/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cattle/:cowId/health
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/cattle/:cowId/health", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).get("/api/cattle/xyz/health");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cowid/i);
  });

  test("200 returns health records", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        health_record_id: 10,
        cow_id: 5,
        vaccine_name: "BRD Shield",
        administration_date: "2024-03-01",
        health_program_name: "Premium",
        certification_number: "CERT-001",
        verified_flag: true,
        created_at: new Date(),
      }],
    });
    const res = await request(app).get("/api/cattle/5/health");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].vaccine_name).toBe("BRD Shield");
  });

  test("500 on db error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).get("/api/cattle/5/health");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch cow health/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cattle/:cowId
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/cattle/:cowId", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).get("/api/cattle/bad-id");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cowid/i);
  });

  test("404 when cow not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).get("/api/cattle/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/cow not found/i);
  });

  test("200 returns cow details", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        animal_id: 5,
        herd_id: 2,
        registration_number: "REG-001",
        official_id: "TAG-001",
        animal_name: "Bessie",
        breed_code: "AN",
        sex_code: "C",
        birth_date: "2022-01-15",
        sire_registration_number: null,
        dam_registration_number: null,
        is_genomic_enhanced: false,
        created_at: new Date(),
        updated_at: new Date(),
        herd_name: "Test Herd",
        rancher_id: 1,
        latest_weight_lbs: 750,
        latest_weight_date: "2024-01-01",
        latest_health_verified: true,
        latest_vaccine_name: "BRD Shield",
        latest_health_program_name: "Premium",
        latest_health_date: "2024-01-01",
        latest_listing_value: 1500,
        latest_fair_value: 1600,
        latest_valuation_date: "2024-01-01",
      }],
    });
    const res = await request(app).get("/api/cattle/5");
    expect(res.status).toBe(200);
    expect(res.body.animal_name).toBe("Bessie");
  });

  test("500 on db error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).get("/api/cattle/5");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch cow details/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/cattle/:cowId
// ─────────────────────────────────────────────────────────────────────────────
describe("PATCH /api/cattle/:cowId", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).patch("/api/cattle/bad").send({ animalName: "Daisy" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cowid/i);
  });

  test("400 when no valid fields provided", async () => {
    const res = await request(app).patch("/api/cattle/5").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no valid fields/i);
  });

  test("400 for invalid sexCode", async () => {
    const res = await request(app).patch("/api/cattle/5").send({ sexCode: "Z" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid sexcode/i);
  });

  test("404 when cow not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app).patch("/api/cattle/999").send({ animalName: "Ghost" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/cow not found/i);
  });

  test("200 updates animalName successfully", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ animal_id: 5, animal_name: "Daisy" }],
    });
    const res = await request(app).patch("/api/cattle/5").send({ animalName: "Daisy" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
    expect(res.body.cow.animal_name).toBe("Daisy");
  });

  test("200 updates sexCode with valid uppercase value", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ animal_id: 5, sex_code: "B" }],
    });
    const res = await request(app).patch("/api/cattle/5").send({ sexCode: "b" }); // lowercase input
    expect(res.status).toBe(200);
    // Verify the query received the uppercased value
    const queryArgs = mockQuery.mock.calls[0][1];
    expect(queryArgs[0]).toBe("B");
  });

  test("500 on db error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).patch("/api/cattle/5").send({ animalName: "Daisy" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to update cow/i);
  });
});
