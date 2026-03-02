import express from "express";
const router = express.Router();
import {
  getPools,
  getPoolById,
  getPoolCows,
  getPoolLifecycleEvents,
  getPoolStageBreakdown,
  getPoolBudgetBreakdown,
  getPoolDocuments,
  getPoolOwnership,
  getPoolTransactions,
} from "../controllers/pools.controller.js";

router.get("/", getPools);
router.get("/:poolId", getPoolById);
router.get("/:poolId/cows", getPoolCows);
router.get("/:poolId/lifecycle-events", getPoolLifecycleEvents);
router.get("/:poolId/stage-breakdown", getPoolStageBreakdown);
router.get("/:poolId/budget-breakdown", getPoolBudgetBreakdown);
router.get("/:poolId/documents", getPoolDocuments);
router.get("/:poolId/ownership", getPoolOwnership);
router.get("/:poolId/transactions", getPoolTransactions);

export default router;
