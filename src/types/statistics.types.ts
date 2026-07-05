/**
 * Statistics types — DTOs for the visitor statistics API.
 * Maps to tables in the `socrates` database.
 */

export interface DailySummaryDTO {
  totalRequests: number;
  botCount: number;
  humanCount: number;
  scannerCount: number;
  uniqueIps: number;
}

export interface ThreatIntelDTO {
  gitProbes: number;
  envProbes: number;
  wpProbes: number;
  adminScans: number;
  sqliAttempts: number;
  configLeaks: number;
  otherProbes: number;
}

export interface IpHitDTO {
  ip: string;
  countryCode: string | null;
  countryName: string | null;
  hitCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  isBot: boolean;
  botName: string | null;
  topPath: string | null;
  topStatus: number | null;
}

export interface BotActivityDTO {
  botName: string;
  hitCount: number;
  uniqueIps: number;
}

export interface PathActivityDTO {
  path: string;
  hitCount: number;
  uniqueIps: number;
  status200: number;
  status404: number;
  statusOther: number;
  category: string;
}

export interface StatusCodeDTO {
  code: number;
  hitCount: number;
}

export interface HourlyActivityDTO {
  hour: number;
  hitCount: number;
  botCount: number;
}

export interface VisitorsReportDTO {
  date: string;
  summary: DailySummaryDTO;
  threatIntelligence: ThreatIntelDTO;
  topIps: IpHitDTO[];
  botBreakdown: BotActivityDTO[];
  paths: PathActivityDTO[];
  statusCodes: StatusCodeDTO[];
  hourlyActivity: HourlyActivityDTO[];
}
