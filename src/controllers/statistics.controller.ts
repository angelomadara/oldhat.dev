import { Request, Response } from "express";
import BaseController from "./base.controller";
import { StatisticsService } from "../services/statistics.service";

/**
 * Statistics Controller
 *
 * Receives its service dependency via constructor (DIP).
 * The service itself receives a repository abstraction (OCP + DIP).
 *
 * GET /api/v1/statistics/visitors?date=YYYY-MM-DD
 *   → Returns daily report from the socrates database.
 */
export class StatisticsController extends BaseController {
  constructor(private readonly statisticsService: StatisticsService) {
    super();
  }

  visitors = async (req: Request, res: Response): Promise<Response> => {
    try {
      const date = req.query.date as string | undefined;
      const report = await this.statisticsService.getVisitorsReport(date);
      return this.sendSuccess(res, report, "Statistics retrieved successfully");
    } catch (error) {
      if (error instanceof Error) {
        return this.sendError(res, error.message, (error as any).statusCode || 500);
      }
      return this.sendServerError(res, error, "Failed to retrieve statistics");
    }
  };
}

export default StatisticsController;
