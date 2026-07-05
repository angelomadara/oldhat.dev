import { Request, Response } from "express";
import BaseController from "./base.controller";
import { ControllerMethod } from "../types";
import { query } from "../config/database";

/**
 * Statistics Controller
 *
 * Returns daily visitor/attack report data from the socrates database.
 * Mirrors the output of oldhat_daily_report.py as a JSON API.
 *
 * GET /api/v1/statistics/visitors?date=2026-07-05
 *   → Returns summary, top IPs, bot breakdown, paths, status codes,
 *     hourly activity, and threat intelligence for the given date.
 *   → Omits ?date to return the latest available report date.
 */
class StatisticsController extends BaseController {
  visitors: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const rawDate = (req.query.date as string) || null;

      // ── Resolve date ────────────────────────────────────
      let reportDate: string;
      if (rawDate) {
        // Validate YYYY-MM-DD format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          return this.sendBadRequest(res, "Invalid date format. Use YYYY-MM-DD.");
        }
        reportDate = rawDate;
      } else {
        // Fetch the latest report date from daily_reports
        const latestRows = await query<any[]>(
          "SELECT report_date FROM daily_reports ORDER BY report_date DESC LIMIT 1",
        );
        if (!latestRows.length) {
          return this.sendNotFound(res, "No report data found.");
        }
        reportDate = latestRows[0].report_date instanceof Date
          ? (latestRows[0].report_date as Date).toISOString().slice(0, 10)
          : String(latestRows[0].report_date);
      }

      // ── 1. Daily summary ────────────────────────────────
      const summaryRows = await query<any[]>(
        `SELECT total_requests, bot_count, human_count, scanner_count,
                unique_ips, git_probes, env_probes, wp_probes,
                admin_scans, sqli_attempts, config_leaks, other_probes
         FROM daily_reports WHERE report_date = ?`,
        [reportDate],
      );
      if (!summaryRows.length) {
        return this.sendNotFound(res, `No report data for ${reportDate}.`);
      }

      // ── 2. Top IPs with geo ─────────────────────────────
      const ipRows = await query<any[]>(
        `SELECT ip, country_code, country_name, hit_count,
                first_seen, last_seen, is_bot, bot_name,
                top_path, top_status
         FROM ip_hits WHERE report_date = ?
         ORDER BY hit_count DESC LIMIT 20`,
        [reportDate],
      );

      // ── 3. Bot breakdown ────────────────────────────────
      const botRows = await query<any[]>(
        `SELECT bot_name, hit_count, unique_ips
         FROM bot_activity WHERE report_date = ?
         ORDER BY hit_count DESC`,
        [reportDate],
      );

      // ── 4. Path activity ────────────────────────────────
      const pathRows = await query<any[]>(
        `SELECT path, hit_count, unique_ips,
                status_200, status_404, status_other, category
         FROM path_activity WHERE report_date = ?
         ORDER BY hit_count DESC LIMIT 30`,
        [reportDate],
      );

      // ── 5. Status code distribution ─────────────────────
      const statusRows = await query<any[]>(
        `SELECT status_code, hit_count
         FROM status_activity WHERE report_date = ?
         ORDER BY status_code`,
        [reportDate],
      );

      // ── 6. Hourly activity ──────────────────────────────
      const hourRows = await query<any[]>(
        `SELECT hour, hit_count, bot_count
         FROM hourly_activity WHERE report_date = ?
         ORDER BY hour`,
        [reportDate],
      );

      // ── Assemble response ───────────────────────────────
      return this.sendSuccess(
        res,
        {
          date: reportDate,
          summary: {
            totalRequests: summaryRows[0].total_requests,
            botCount: summaryRows[0].bot_count,
            humanCount: summaryRows[0].human_count,
            scannerCount: summaryRows[0].scanner_count,
            uniqueIps: summaryRows[0].unique_ips,
          },
          threatIntelligence: {
            gitProbes: summaryRows[0].git_probes,
            envProbes: summaryRows[0].env_probes,
            wpProbes: summaryRows[0].wp_probes,
            adminScans: summaryRows[0].admin_scans,
            sqliAttempts: summaryRows[0].sqli_attempts,
            configLeaks: summaryRows[0].config_leaks,
            otherProbes: summaryRows[0].other_probes,
          },
          topIps: ipRows.map((r) => ({
            ip: r.ip,
            countryCode: r.country_code,
            countryName: r.country_name,
            hitCount: r.hit_count,
            firstSeen: r.first_seen,
            lastSeen: r.last_seen,
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
        },
        "Statistics retrieved successfully",
      );
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve statistics");
    }
  };
}

export default new StatisticsController();
