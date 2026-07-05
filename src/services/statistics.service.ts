import { VisitorsReportDTO } from "../types/statistics.types";
import { IStatisticsRepository } from "../repositories/interfaces/IStatisticsRepository";
import { AppError } from "../utils/appError";

/**
 * StatisticsService
 *
 * Business logic for visitor statistics.
 *
 * Responsibilities:
 *   - Date validation and resolution
 *   - Orchestrating multiple repository calls
 *   - Assembling the API response DTO (shape belongs here, not in the repo)
 *
 * Depends on IStatisticsRepository (abstraction) — the DB
 * implementation can be swapped without changing this layer.
 */
export class StatisticsService {
  constructor(private readonly statsRepo: IStatisticsRepository) {}

  /**
   * Get the visitors report for a given date, or the latest available.
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

    // ── Fetch raw data from repository ───────────────────
    const summary = await this.statsRepo.getDailySummary(reportDate);
    if (!summary) {
      throw new AppError(`No report data for ${reportDate}.`, 404);
    }

    const [ipRows, botRows, pathRows, statusRows, hourRows] =
      await Promise.all([
        this.statsRepo.getTopIps(reportDate),
        this.statsRepo.getBotBreakdown(reportDate),
        this.statsRepo.getPaths(reportDate),
        this.statsRepo.getStatusCodes(reportDate),
        this.statsRepo.getHourlyActivity(reportDate),
      ]);

    // ── Assemble DTO (response shape) ────────────────────
    return {
      date: reportDate,
      summary: {
        totalRequests: summary.total_requests,
        botCount: summary.bot_count,
        humanCount: summary.human_count,
        scannerCount: summary.scanner_count,
        uniqueIps: summary.unique_ips,
      },
      threatIntelligence: {
        gitProbes: summary.git_probes,
        envProbes: summary.env_probes,
        wpProbes: summary.wp_probes,
        adminScans: summary.admin_scans,
        sqliAttempts: summary.sqli_attempts,
        configLeaks: summary.config_leaks,
        otherProbes: summary.other_probes,
      },
      topIps: ipRows.map((r) => ({
        ip: r.ip,
        countryCode: r.country_code,
        countryName: r.country_name,
        hitCount: r.hit_count,
        firstSeen: r.first_seen ? String(r.first_seen) : null,
        lastSeen: r.last_seen ? String(r.last_seen) : null,
        isBot: Boolean(r.is_bot),
        botName: r.bot_name,
        topPath: r.top_path,
        topStatus: r.top_status,
      })),
      botBreakdown: botRows.map((r) => ({
        botName: r.bot_name,
        hitCount: r.hit_count,
        uniqueIps: r.unique_ips,
      })),
      paths: pathRows.map((r) => ({
        path: r.path,
        hitCount: r.hit_count,
        uniqueIps: r.unique_ips,
        status200: r.status_200,
        status404: r.status_404,
        statusOther: r.status_other,
        category: r.category,
      })),
      statusCodes: statusRows.map((r) => ({
        code: r.status_code,
        hitCount: r.hit_count,
      })),
      hourlyActivity: hourRows.map((r) => ({
        hour: r.hour,
        hitCount: r.hit_count,
        botCount: r.bot_count,
      })),
    };
  }
}

export default StatisticsService;
