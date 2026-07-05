import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import config from "./config";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";
import { requestId } from "./middleware/requestId";

const app = express();

// ── Security Middleware (order matters) ─────────────

// 1. Request ID — earliest for full traceability
app.use(requestId);

// 2. Security headers with Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com", "https://analytics.ahrefs.com"],
      connectSrc: ["'self'", "https://analytics.ahrefs.com", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// 3. CORS — locked to configured origins
app.use(
  cors({
    origin: config.corsAllowedOrigins,
    credentials: true,
  }),
);

// 4. Body parsing with size limit (prevents memory exhaustion)
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// ── Static Files ───────────────────────────────────
// Serve oldhat.dev static site from /public
app.use(express.static(path.join(__dirname, "..", "public")));

// ── Routes ──────────────────────────────────────────
app.use(config.apiPrefix, routes);

// ── Error Handling ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
