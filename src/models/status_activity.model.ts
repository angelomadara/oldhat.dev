import { RowDataPacket } from "mysql2/promise";

/**
 * Status activity model — maps to `status_activity` table in socrates.
 */
export interface StatusActivityRow {
  id: number;
  report_date: string;
  status_code: number;
  hit_count: number;
}

export interface StatusActivityRowPacket extends StatusActivityRow, RowDataPacket {}
