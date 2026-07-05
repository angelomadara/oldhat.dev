import { Router } from "express";
import healthController from "../controllers/examples/health.controller";
import statisticsController from "../controllers/statistics.controller";
import { generalLimiter } from "../middleware/rateLimiter";

const router = Router();

// ── Public Routes ───────────────────────────────

// Health check (no rate limit)
router.get("/health", healthController.check);

// Daily visitor statistics (rate-limited)
router.get("/statistics/visitors", generalLimiter, statisticsController.visitors);

export default router;
