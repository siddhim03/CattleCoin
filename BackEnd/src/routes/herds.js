import express from "express";
import { patchHerd } from "../controllers/herds.controller.js";

const router = express.Router();

router.patch("/:herdId", patchHerd);

export default router;
