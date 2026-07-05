import { RowDataPacket } from "mysql2/promise";

/**
 * Path activity model — maps to `path_activity` table in socrates.
 */
export interface PathActivityRow {
  id: number;
  report_date: string;
  path: string;
  hit_count: number;
  unique_ips: number;
  status_200: number;
  status_404: number;
  status_other: number;
  category: string;
}

export interface PathActivityRowPacket extends PathActivityRow, RowDataPacket {}
