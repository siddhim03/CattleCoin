import express from "express";
import {
  investorPortal,
  login,
  me,
  rancherPortal,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/portal/investor", requireAuth, requireRole("investor", "admin"), investorPortal);
router.get("/portal/rancher", requireAuth, requireRole("rancher", "admin"), rancherPortal);

export default router;
