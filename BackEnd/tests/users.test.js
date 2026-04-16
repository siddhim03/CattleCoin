import { jest } from "@jest/globals";

const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express }      = await import("express");
const { default: request }      = await import("supertest");
const { default: usersRouter }  = await import("../src/routes/users.js");

const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);

describe("GET /api/users", () => {
  beforeEach(() => mockQuery.mockReset());

  test("200 returns all users when no role filter", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 1, slug: "alice", role: "investor", email: "a@test.com" },
        { user_id: 2, slug: "bob",   role: "rancher",  email: "b@test.com" },
      ],
    });
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ userId: 1, slug: "alice", role: "investor" });
  });

  test("200 filters by role query param", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 3, slug: "carol", role: "feedlot", email: "c@test.com" }],
    });
    const res = await request(app).get("/api/users?role=feedlot");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // confirm query was parameterised with the role
    expect(mockQuery.mock.calls[0][1]).toEqual(["feedlot"]);
  });

  test("400 for invalid role", async () => {
    const res = await request(app).get("/api/users?role=superadmin");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test("200 with each valid role value", async () => {
    for (const role of ["investor", "rancher", "feedlot", "admin"]) {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get(`/api/users?role=${role}`);
      expect(res.status).toBe(200);
    }
  });

  test("500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch users/i);
  });
});
