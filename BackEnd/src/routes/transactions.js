import express from "express";
import { createTransaction } from "../controllers/transactions.controller.js";

const router = express.Router();

router.post("/", createTransaction);

export default router;
