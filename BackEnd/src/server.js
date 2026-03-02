import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import poolsRoutes from "./routes/pools.js";
import portfolioRoutes from "./routes/portfolio.js";
import usersRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import herdsRoutes from "./routes/herds.js";
import transactionsRoutes from "./routes/transactions.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pools", poolsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/herds", herdsRoutes);
app.use("/api/transactions", transactionsRoutes);

app.get("/api/health", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({
    status: "ok",
    dbTime: result.rows[0],
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
