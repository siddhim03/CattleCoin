import express from "express";
import {
  getPortfolio,
  getPortfolioTopPools,
  getPortfolioRecentEvents,
} from "../controllers/portfolio.controller.js";

const router = express.Router();

router.get("/", getPortfolio);
router.get("/top-pools", getPortfolioTopPools);
router.get("/recent-events", getPortfolioRecentEvents);

export default router;
