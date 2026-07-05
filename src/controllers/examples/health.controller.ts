import { Request, Response } from "express";
import BaseController from "../base.controller";
import { ControllerMethod } from "../../types";

/**
 * Simple controller example — no interface contract, purely custom methods.
 * Use this pattern for non-CRUD endpoints (health, stats, auth, etc.).
 */
class HealthController extends BaseController {
  check: ControllerMethod = async (_req: Request, res: Response) => {
    return this.sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }, "Service is healthy");
  };
}

export default new HealthController();
