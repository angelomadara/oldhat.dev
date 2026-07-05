import { VisitorsReportDTO } from "../../types/statistics.types";

/**
 * Statistics Repository Interface
 *
 * Read-only contract for querying the socrates database.
 * The service depends on this abstraction, not on MySQL specifics.
 */
export interface IStatisticsRepository {
  /** Fetch the latest report date available. */
  getLatestReportDate(): Promise<string | null>;

  /** Fetch the full visitors report for a given date. */
  getReportByDate(date: string): Promise<VisitorsReportDTO | null>;
}
