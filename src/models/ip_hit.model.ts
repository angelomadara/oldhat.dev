import { RowDataPacket } from "mysql2/promise";

/**
 * IP hit model — maps to `ip_hits` table in socrates.
 */
export interface IpHitRow {
  id: number;
  report_date: string;
  ip: string;
  country_code: string | null;
  country_name: string | null;
  hit_count: number;
  first_seen: string | null;
  last_seen: string | null;
  is_bot: boolean | number;
  bot_name: string | null;
  top_path: string | null;
  top_status: number | null;
}

export interface IpHitRowPacket extends IpHitRow, RowDataPacket {}
