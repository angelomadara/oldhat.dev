import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  // ── Server ─────────────────────────────────────
  host: process.env.HOST || "127.0.0.1",

  // ── MySQL ─────────────────────────────────────────
  dbHost: required("DB_HOST"),
  dbPort: parseInt(required("DB_PORT"), 10),
  dbUser: required("DB_USER"),
  dbPassword: required("DB_PASSWORD"),
  dbName: required("DB_NAME"),

  // ── Rate Limiting ──────────────────────────────
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  // ── Pagination ────────────────────────────────────
  pageLimit: parseInt(process.env.PAGE_LIMIT || "10", 10),

  // ── JWT ────────────────────────────────────────
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // ── CORS ───────────────────────────────────────
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : ["https://oldhat.dev", "https://www.oldhat.dev"],

  // ── Request Body ───────────────────────────────
  bodyLimit: process.env.BODY_LIMIT || "10kb",
};

export default config;
