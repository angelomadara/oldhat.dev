import { RowDataPacket } from "mysql2/promise";

/**
 * Bot activity model — maps to `bot_activity` table in socrates.
 */
export interface BotActivityRow {
  id: number;
  report_date: string;
  bot_name: string;
  hit_count: number;
  unique_ips: number;
}

export interface BotActivityRowPacket extends BotActivityRow, RowDataPacket {}
