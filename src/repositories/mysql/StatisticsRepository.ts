import { RowDataPacket } from "mysql2/promise";
import { query } from "../../config/database";
import { IStatisticsRepository } from "../interfaces/IStatisticsRepository";
import { VisitorsReportDTO } from "../../types/statistics.types";

/**
 * MySQL-backed implementation of IStatisticsRepository.
 *
 * Performs JOIN-free reads across the 6 report tables.
 * All methods are read-only — no CRUD here.
 */
export class MysqlStatisticsRepository implements IStatisticsRepository {
  async getLatestReportDate(): Promise<string | null> {
    const rows = await query<RowDataPacket[]>(
      "SELECT report_date FROM daily_reports ORDER BY report_date DESC LIMIT 1",
    );
    if (!rows.length) return null;

    const d = rows[0].report_date;
    return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
  }

  async getReportByDate(date: string): Promise<VisitorsReportDTO | null> {
    // ── 1. Daily summary ────────────────────────────────
    const summaryRows = await query<RowDataPacket[]>(
      `SELECT total_requests, bot_count, human_count, scanner_count,
              unique_ips, git_probes, env_probes, wp_probes,
              admin_scans, sqli_attempts, config_leaks, other_probes
       FROM daily_reports WHERE report_date = ?`,
      [date],
    );
    if (!summaryRows.length) return null;

    const s = summaryRows[0];

    // ── 2. Top IPs with geo ─────────────────────────────
    const ipRows = await query<RowDataPacket[]>(
      `SELECT ip, country_code, country_name, hit_count,
              first_seen, last_seen, is_bot, bot_name,
              top_path, top_status
       FROM ip_hits WHERE report_date = ?
       ORDER BY hit_count DESC LIMIT 20`,
      [date],
    );

    // ── 3. Bot breakdown ────────────────────────────────
    const botRows = await query<RowDataPacket[]>(
      `SELECT bot_name, hit_count, unique_ips
       FROM bot_activity WHERE report_date = ?
       ORDER BY hit_count DESC`,
      [date],
    );

    // ── 4. Path activity ────────────────────────────────
    const pathRows = await query<RowDataPacket[]>(
      `SELECT path, hit_count, unique_ips,
              status_200, status_404, status_other, category
       FROM path_activity WHERE report_date = ?
       ORDER BY hit_count DESC LIMIT 30`,
      [date],
    );

    // ── 5. Status code distribution ─────────────────────
    const statusRows = await query<RowDataPacket[]>(
      `SELECT status_code, hit_count
       FROM status_activity WHERE report_date = ?
       ORDER BY status_code`,
      [date],
    );

    // ── 6. Hourly activity ──────────────────────────────
    const hourRows = await query<RowDataPacket[]>(
      `SELECT hour, hit_count, bot_count
       FROM hourly_activity WHERE report_date = ?
       ORDER BY hour`,
      [date],
    );

    return {
      date,
      summary: {
        totalRequests: s.total_requests,
        botCount: s.bot_count,
        humanCount: s.human_count,
        scannerCount: s.scanner_count,
        uniqueIps: s.unique_ips,
      },
      threatIntelligence: {
        gitProbes: s.git_probes,
        envProbes: s.env_probes,
        wpProbes: s.wp_probes,
        adminScans: s.admin_scans,
        sqliAttempts: s.sqli_attempts,
        configLeaks: s.config_leaks,
        otherProbes: s.other_probes,
      },
      topIps: ipRows.map((r: any) => ({
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
      botBreakdown: botRows.map((r: any) => ({
        botName: r.bot_name,
        hitCount: r.hit_count,
        uniqueIps: r.unique_ips,
      })),
      paths: pathRows.map((r: any) => ({
        path: r.path,
        hitCount: r.hit_count,
        uniqueIps: r.unique_ips,
        status200: r.status_200,
        status404: r.status_404,
        statusOther: r.status_other,
        category: r.category,
      })),
      statusCodes: statusRows.map((r: any) => ({
        code: r.status_code,
        hitCount: r.hit_count,
      })),
      hourlyActivity: hourRows.map((r: any) => ({
        hour: r.hour,
        hitCount: r.hit_count,
        botCount: r.bot_count,
      })),
    };
  }
}

export default MysqlStatisticsRepository;
