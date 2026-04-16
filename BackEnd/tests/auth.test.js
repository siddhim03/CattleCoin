import { jest } from "@jest/globals";

// ── Mock pool BEFORE importing the router ────────────────────────────────────
const mockQuery = jest.fn();
jest.unstable_mockModule("../src/db.js", () => ({ default: { query: mockQuery } }));

const { default: express } = await import("express");
const { default: request }  = await import("supertest");
const { default: authRouter } = await import("../src/routes/auth.js");

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  beforeEach(() => mockQuery.mockReset());

  test("400 when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username and password are required/i);
  });

  test("400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username and password are required/i);
  });

  test("401 when user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "any" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test("401 when password is wrong", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 1, slug: "alice", role: "investor", email: "a@test.com", password_hash: "correct" }],
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "wrong" });
    expect(res.status).toBe(401);
  });

  test("200 login succeeds with password_hash match", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 7, slug: "alice", role: "investor", email: "a@test.com", password_hash: "mypassword" }],
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "mypassword" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 7, slug: "alice", role: "investor", email: "a@test.com" });
  });

  test("200 login succeeds using slug as password (seed users)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 3, slug: "bob", role: "rancher", email: "b@test.com", password_hash: "something_else" }],
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "bob", password: "bob" }); // slug fallback
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("bob");
  });

  test("500 on unexpected db error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "pw" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/login failed/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/signup", () => {
  beforeEach(() => mockQuery.mockReset());

  const valid = { username: "Charlie", email: "c@test.com", password: "pass123", role: "investor" };

  test("400 when any required field is missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({ username: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("400 for invalid role", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...valid, role: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  test("409 when username or email already taken", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 99 }] }); // existing found
    const res = await request(app).post("/api/auth/signup").send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already taken/i);
  });

  test("201 on successful signup", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [{ user_id: 42, slug: "charlie", role: "investor", email: "c@test.com" }],
      });
    const res = await request(app).post("/api/auth/signup").send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: 42, slug: "charlie", role: "investor" });
  });

  test("slug is lowercased and spaces replaced with underscores", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, slug: "john_doe", role: "rancher", email: "j@test.com" }],
      });
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "John Doe", email: "j@test.com", password: "pw", role: "rancher" });
    expect(res.status).toBe(201);
    // Confirm the INSERT was called with the lowercased slug
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][3]).toBe("john_doe");
  });

  test("500 on unexpected db error during insert", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error("DB down"));
    const res = await request(app).post("/api/auth/signup").send(valid);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/sign up failed/i);
  });
});
