import { Router } from "express";
import healthController from "../controllers/examples/health.controller";

const router = Router();

// ── Health (the only public endpoint) ────────────
router.get("/health", healthController.check);

export default router;
