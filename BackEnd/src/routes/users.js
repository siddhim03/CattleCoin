import express from "express";
import {
  getUserOwnership,
  getUserTransactions,
} from "../controllers/users.controller.js";

const router = express.Router();

router.get("/:userId/ownership", getUserOwnership);
router.get("/:userId/transactions", getUserTransactions);

export default router;
