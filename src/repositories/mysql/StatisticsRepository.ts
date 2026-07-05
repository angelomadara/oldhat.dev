import {
  DailyReportRowPacket,
  IpHitRowPacket,
  BotActivityRowPacket,
  PathActivityRowPacket,
  StatusActivityRowPacket,
  HourlyActivityRowPacket,
} from "../../models";
import { query } from "../../config/database";
import { IStatisticsRepository } from "../interfaces/IStatisticsRepository";

/**
 * MySQL-backed implementation of IStatisticsRepository.
 *
 * Returns raw typed rows only — no DTO assembly.
 * Every query has one reason to change: the data it fetches.
 */
export class MysqlStatisticsRepository implements IStatisticsRepository {
  async getLatestReportDate(): Promise<string | null> {
    const rows = await query<DailyReportRowPacket[]>(
      "SELECT report_date FROM daily_reports ORDER BY report_date DESC LIMIT 1",
    );
    if (!rows.length) return null;

    const d = rows[0].report_date;
    return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
  }

  async getDailySummary(date: string): Promise<DailyReportRowPacket | null> {
    const rows = await query<DailyReportRowPacket[]>(
      `SELECT total_requests, bot_count, human_count, scanner_count,
              unique_ips, git_probes, env_probes, wp_probes,
              admin_scans, sqli_attempts, config_leaks, other_probes
       FROM daily_reports WHERE report_date = ?`,
      [date],
    );
    return rows[0] ?? null;
  }

  async getTopIps(date: string, limit: number = 20): Promise<IpHitRowPacket[]> {
    return query<IpHitRowPacket[]>(
      `SELECT ip, country_code, country_name, hit_count,
              first_seen, last_seen, is_bot, bot_name,
              top_path, top_status
       FROM ip_hits WHERE report_date = ?
       ORDER BY hit_count DESC LIMIT ?`,
      [date, String(limit)],
    );
  }

  async getBotBreakdown(date: string): Promise<BotActivityRowPacket[]> {
    return query<BotActivityRowPacket[]>(
      `SELECT bot_name, hit_count, unique_ips
       FROM bot_activity WHERE report_date = ?
       ORDER BY hit_count DESC`,
      [date],
    );
  }

  async getPaths(date: string, limit: number = 30): Promise<PathActivityRowPacket[]> {
    return query<PathActivityRowPacket[]>(
      `SELECT path, hit_count, unique_ips,
              status_200, status_404, status_other, category
       FROM path_activity WHERE report_date = ?
       ORDER BY hit_count DESC LIMIT ?`,
      [date, String(limit)],
    );
  }

  async getStatusCodes(date: string): Promise<StatusActivityRowPacket[]> {
    return query<StatusActivityRowPacket[]>(
      `SELECT status_code, hit_count
       FROM status_activity WHERE report_date = ?
       ORDER BY status_code`,
      [date],
    );
  }

  async getHourlyActivity(date: string): Promise<HourlyActivityRowPacket[]> {
    return query<HourlyActivityRowPacket[]>(
      `SELECT hour, hit_count, bot_count
       FROM hourly_activity WHERE report_date = ?
       ORDER BY hour`,
      [date],
    );
  }
}

export default MysqlStatisticsRepository;
