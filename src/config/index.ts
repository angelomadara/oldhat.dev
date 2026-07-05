import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  // ── Server ─────────────────────────────────────
  host: process.env.HOST || "127.0.0.1",

  // ── MySQL ─────────────────────────────────────────
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: parseInt(process.env.DB_PORT || "3306", 10),
  dbUser: process.env.DB_USER || "socrates",
  dbPassword: process.env.DB_PASSWORD || "know_thyself_2026",
  dbName: process.env.DB_NAME || "oldhat_visitors",

  // ── Rate Limiting ──────────────────────────────
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  // ── Pagination ────────────────────────────────────
  pageLimit: parseInt(process.env.PAGE_LIMIT || "10", 10),

  // ── JWT ────────────────────────────────────────
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-in-production",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // ── CORS ───────────────────────────────────────
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : ["https://oldhat.dev", "https://www.oldhat.dev"],

  // ── Request Body ───────────────────────────────
  bodyLimit: process.env.BODY_LIMIT || "10kb",
};

export default config;
