import { RowDataPacket } from "mysql2/promise";

/**
 * Hourly activity model — maps to `hourly_activity` table in socrates.
 */
export interface HourlyActivityRow {
  id: number;
  report_date: string;
  hour: number;
  hit_count: number;
  bot_count: number;
}

export interface HourlyActivityRowPacket extends HourlyActivityRow, RowDataPacket {}
