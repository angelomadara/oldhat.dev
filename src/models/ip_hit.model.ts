import { RowDataPacket } from "mysql2/promise";

/**
 * IP hit model — maps to `ip_hits` table in socrates.
 * first_seen and last_seen are DATETIME — mysql2 returns Date objects.
 */
export interface IpHitRow {
  id: number;
  report_date: string;
  ip: string;
  country_code: string | null;
  country_name: string | null;
  hit_count: number;
  first_seen: Date | string | null;
  last_seen: Date | string | null;
  is_bot: boolean | number;
  bot_name: string | null;
  top_path: string | null;
  top_status: number | null;
}

export interface IpHitRowPacket extends IpHitRow, RowDataPacket {}
