import { VisitorsReportDTO } from "../types/statistics.types";
import { IStatisticsRepository } from "../repositories/interfaces/IStatisticsRepository";
import { AppError } from "../utils/appError";

/**
 * StatisticsService
 *
 * Business logic for visitor statistics.
 * Depends on IStatisticsRepository (abstraction) — the DB
 * implementation can be swapped without changing this layer.
 */
export class StatisticsService {
  constructor(private readonly statsRepo: IStatisticsRepository) {}

  /**
   * Get the visitors report for a given date, or the latest available.
   * Throws AppError for missing or invalid data.
   */
  async getVisitorsReport(date?: string): Promise<VisitorsReportDTO> {
    let reportDate = date;

    // ── Validate format if provided ──────────────────────
    if (reportDate && !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      throw new AppError("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    // ── Resolve latest date if omitted ───────────────────
    if (!reportDate) {
      const latest = await this.statsRepo.getLatestReportDate();
      if (!latest) {
        throw new AppError("No report data found.", 404);
      }
      reportDate = latest;
    }

    // ── Fetch the report ─────────────────────────────────
    const report = await this.statsRepo.getReportByDate(reportDate);
    if (!report) {
      throw new AppError(`No report data for ${reportDate}.`, 404);
    }

    return report;
  }
}

export default StatisticsService;
