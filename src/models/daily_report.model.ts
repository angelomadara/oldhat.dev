import { RowDataPacket } from "mysql2/promise";

/**
 * Daily report model — maps to `daily_reports` table in socrates.
 */
export interface DailyReportRow {
  id: number;
  report_date: Date | string;
  total_requests: number;
  bot_count: number;
  human_count: number;
  scanner_count: number;
  unique_ips: number;
  git_probes: number;
  env_probes: number;
  wp_probes: number;
  admin_scans: number;
  sqli_attempts: number;
  config_leaks: number;
  other_probes: number;
  created_at: Date;
  updated_at: Date;
}

export interface DailyReportRowPacket extends DailyReportRow, RowDataPacket {}
