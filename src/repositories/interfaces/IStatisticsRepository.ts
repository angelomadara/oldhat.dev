import {
  DailyReportRowPacket,
  IpHitRowPacket,
  BotActivityRowPacket,
  PathActivityRowPacket,
  StatusActivityRowPacket,
  HourlyActivityRowPacket,
} from "../../models";

/**
 * Statistics Repository Interface
 *
 * Each method returns raw typed rows — no DTO assembly.
 * The service layer shapes the response.
 */
export interface IStatisticsRepository {
  /** Fetch the latest report date available. */
  getLatestReportDate(): Promise<string | null>;

  /** Fetch the daily summary row for a given date. */
  getDailySummary(date: string): Promise<DailyReportRowPacket | null>;

  /** Fetch the top IPs for a given date, ordered by hit count descending. */
  getTopIps(date: string, limit?: number): Promise<IpHitRowPacket[]>;

  /** Fetch the bot breakdown for a given date. */
  getBotBreakdown(date: string): Promise<BotActivityRowPacket[]>;

  /** Fetch the path activity for a given date, ordered by hit count descending. */
  getPaths(date: string, limit?: number): Promise<PathActivityRowPacket[]>;

  /** Fetch the status code distribution for a given date. */
  getStatusCodes(date: string): Promise<StatusActivityRowPacket[]>;

  /** Fetch the hourly activity for a given date. */
  getHourlyActivity(date: string): Promise<HourlyActivityRowPacket[]>;
}
