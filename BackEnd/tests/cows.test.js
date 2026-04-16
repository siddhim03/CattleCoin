import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }    = await import("express");
const { default: request }    = await import("supertest");
const { default: cowsRouter } = await import("../src/routes/cows.js");

const app = express();
app.use(express.json());
app.use("/api/cows", cowsRouter);

// Base animal row returned by the first query
const animalRow = {
  animal_id: 5, herd_id: "herd-1", registration_number: "REG-001",
  official_id: "TAG-001", animal_name: "Bessie", breed_code: "AN",
  sex_code: "C", birth_date: "2022-01-15",
  sire_registration_number: null, dam_registration_number: null,
  is_genomic_enhanced: false, created_at: new Date(),
  dominant_stage: "RANCH", herd_verified: true,
  listing_price: "5000", head_count: "25",
};

// Helper: mock all 8 sequential queries for a successful GET /api/cows/:cowId
function mockAllCowQueries() {
  mockQuery
    .mockResolvedValueOnce({ rows: [animalRow] })                                    // 1. base animal
    .mockResolvedValueOnce({ rows: [{ weight_lbs: "750" }] })                        // 2. latest weight
    .mockResolvedValueOnce({ rows: [{ fair_value: "1600" }] })                       // 3. latest valuation
    .mockResolvedValueOnce({ rows: [{ verified: true }] })                           // 4. verified flag
    .mockResolvedValueOnce({                                                         // 5. weight history
      rows: [{ weight_id: 1, animal_id: 5, weight_date: "2024-01-01", weight_lbs: "750", weight_type: "arrival", location_code: "LOT1" }],
    })
    .mockResolvedValueOnce({                                                         // 6. EPDs
      rows: [{ animal_epd_id: 10, animal_id: 5, trait_code: "WW", epd_value: "45.2", accuracy: "0.8", percentile_rank: "25", evaluation_date: "2023-06-01" }],
    })
    .mockResolvedValueOnce({                                                         // 7. health records
      rows: [{ health_record_id: 3, animal_id: 5, vaccine_name: "BRD Shield", administration_date: "2024-01-10", health_program_name: "NHTC", certification_number: "CERT-001", verified_flag: true }],
    })
    .mockResolvedValueOnce({                                                         // 8. valuations
      rows: [{ valuation_id: 7, cow_id: 5, valuation_date: new Date().toISOString(), genetics_score: "85", health_score: "90", certification_score: "80", fair_value: "1600", valuation_method_version: "v1.0" }],
    });
}

describe("GET /api/cows/:cowId", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 for non-numeric cowId", async () => {
    const res = await request(app).get("/api/cows/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid cow id/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test("404 when animal not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // first query returns empty
    const res = await request(app).get("/api/cows/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/cow not found/i);
  });

  test("200 returns complete cow detail object", async () => {
    mockAllCowQueries();
    const res = await request(app).get("/api/cows/5");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cow");
    expect(res.body).toHaveProperty("weights");
    expect(res.body).toHaveProperty("epds");
    expect(res.body).toHaveProperty("healthRecords");
    expect(res.body).toHaveProperty("valuations");
  });

  test("cow object has correct shape and derived fields", async () => {
    mockAllCowQueries();
    const res = await request(app).get("/api/cows/5");
    const { cow } = res.body;
    expect(cow.cowId).toBe("5");
    expect(cow.weightLbs).toBe(750);
    expect(cow.health).toBe("On Track");   // verified = true → "On Track"
    expect(cow.stage).toBe("RANCH");
    expect(cow.totalValue).toBe(1600);
    expect(cow.verified).toBe(true);
  });

  test("health is Watch when not verified", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [animalRow] })
      .mockResolvedValueOnce({ rows: [] })               // no weight
      .mockResolvedValueOnce({ rows: [] })               // no valuation
      .mockResolvedValueOnce({ rows: [{ verified: false }] }) // not verified
      .mockResolvedValueOnce({ rows: [] })               // no weights history
      .mockResolvedValueOnce({ rows: [] })               // no EPDs
      .mockResolvedValueOnce({ rows: [] })               // no health records
      .mockResolvedValueOnce({ rows: [] });              // no valuations

    const res = await request(app).get("/api/cows/5");
    expect(res.status).toBe(200);
    expect(res.body.cow.health).toBe("Watch");
    expect(res.body.cow.weightLbs).toBe(700);           // fallback weight
  });

  test("fallback animal name when animal_name is null", async () => {
    const noNameRow = { ...animalRow, animal_name: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [noNameRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ verified: false }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/cows/5");
    expect(res.status).toBe(200);
    expect(res.body.cow.animalName).toBe("Animal 5");
  });

  test("weights array is correctly mapped", async () => {
    mockAllCowQueries();
    const res = await request(app).get("/api/cows/5");
    expect(res.body.weights).toHaveLength(1);
    expect(res.body.weights[0]).toMatchObject({ weightId: 1, weightLbs: 750, weightType: "arrival" });
  });

  test("epds array is correctly mapped", async () => {
    mockAllCowQueries();
    const res = await request(app).get("/api/cows/5");
    expect(res.body.epds).toHaveLength(1);
    expect(res.body.epds[0]).toMatchObject({ traitCode: "WW", epdValue: 45.2 });
  });

  test("healthRecords array is correctly mapped", async () => {
    mockAllCowQueries();
    const res = await request(app).get("/api/cows/5");
    expect(res.body.healthRecords).toHaveLength(1);
    expect(res.body.healthRecords[0]).toMatchObject({ vaccineName: "BRD Shield", verifiedFlag: true });
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/cows/5");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch cow detail/i);
  });
});
