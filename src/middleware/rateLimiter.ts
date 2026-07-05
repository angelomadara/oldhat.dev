import rateLimit from "express-rate-limit";
import config from "../config";

/**
 * General-purpose rate limiter.
 * Uses the built-in MemoryStore — sufficient for oldhat.dev traffic levels.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * Stricter limiter for auth-sensitive endpoints (login, register, etc.).
 * 15 requests per 15-minute window by default.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
