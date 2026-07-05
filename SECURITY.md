# Security

This document outlines the security measures implemented in the project-skeleton-backend, their configuration, and best practices for maintaining a secure API.

---

## Security Middleware Stack

All middleware is applied in `src/app.ts` in the following order:

```
requestId → helmet → cors → bodyParse(10kb) → mongoSanitize → hpp → rateLimiter → authRoutes → routes
```

### 1. Request ID (`src/middleware/requestId.ts`)

Every incoming request receives a unique identifier for traceability.

| Aspect | Detail |
|---|---|
| **Source** | `X-Request-Id` header (client-supplied) or `crypto.randomUUID()` |
| **Response header** | `X-Request-Id` set on every response |
| **In-app access** | `req.requestId` |

### 2. Helmet — Security Headers

`helmet()` sets approximately 15 HTTP security headers automatically:

| Header | Effect |
|---|---|
| `Content-Security-Policy` | Restricts script/style sources (XSS mitigation) |
| `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options: DENY` | Prevents clickjacking |
| `Strict-Transport-Security` | Enforces HTTPS (when served over TLS) |
| `X-DNS-Prefetch-Control: off` | Privacy — disables DNS prefetching |
| `X-Download-Options: noopen` | IE file download safety |
| `X-Permitted-Cross-Domain-Policies: none` | Restricts Flash/PDF cross-domain |

No configuration required. Customise via the [helmet documentation](https://helmetjs.github.io/) if needed.

### 3. CORS

Cross-Origin Resource Sharing is locked to an explicit whitelist.

| Env var | Default | Description |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed origins |

Example:

```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://myapp.com
```

Credentials (`cookies`, `Authorization` headers) are enabled by default. In production, restrict to your actual frontend domain(s).

### 4. Body Size Limit

Payload size is capped to prevent memory-exhaustion attacks.

| Env var | Default | Description |
|---|---|---|
| `BODY_LIMIT` | `10kb` | Max payload size (uses [bytes](https://www.npmjs.com/package/bytes) format) |

Example:

```
BODY_LIMIT=100kb      # permissive, for file uploads
BODY_LIMIT=1mb        # generous
```

### 5. NoSQL Injection Prevention (`express-mongo-sanitize`)

Strips `$` and `.` characters from `req.body`, `req.params`, and `req.query` — blocking MongoDB operator injection attacks.

**Blocked attack patterns:**

```json
// This would be rejected / sanitised:
{ "email": { "$ne": "" }, "password": { "$ne": "" } }
{ "$where": "this.password.length > 0" }
{ "username": { "$gt": "" } }
```

Applied globally after body parsing — no configuration needed.

### 6. HTTP Parameter Pollution Protection (`hpp`)

Prevents attackers from confusing route logic by sending duplicate query parameters.

**Example of blocked attack:**
```
GET /api/users?role=admin&role=user
```

Add parameter names to the whitelist when your application legitimately accepts duplicate query values (e.g., array filters):

```ts
// In src/app.ts
app.use(hpp({ whitelist: ['ids', 'tags', 'categories'] }));
```

### 7. Rate Limiting (`src/middleware/rateLimiter.ts`)

Two limiters are available:

| Limiter | Rate | Use Case |
|---|---|---|
| `generalLimiter` | 100 requests per 15 minutes | Global API routes |
| `authLimiter` | 15 requests per 15 minutes | Auth endpoints (login, register) |

| Env var | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Sliding window in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

**Backing store:**

- **Production** — When `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are set, the rate limiter uses a **custom `UpstashStore`** (`src/middleware/rateLimitStore.ts`) backed by Upstash Redis (HTTP/REST). This eliminates the unbounded-memory issue of the default in-memory store.
- **Development** — Falls back to the built-in `MemoryStore`, which is fine for local use.

The store implementation:
- `INCR` on every hit, `EXPIRE` on first hit (sets TTL to the window duration)
- `TTL` to compute `resetTime` for rate-limit response headers
- `DECR` on decrement, `DEL` on resetKey

**Applying the auth limiter to a route:**

```ts
import { authLimiter } from "../middleware/rateLimiter";

router.post("/auth/login", authLimiter, authController.login);
router.post("/auth/register", authLimiter, authController.register);
```

---

## Authentication & Authorisation

The skeleton ships with a complete auth system built on JWT (JSON Web Tokens).

### Auth Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ Public | `authLimiter` (15/15m) | Create account → returns `{ user, tokens: { accessToken } }` |
| `POST` | `/auth/login` | ❌ Public | `authLimiter` (15/15m) | Authenticate → returns `{ user, tokens: { accessToken } }` |
| `GET` | `/auth/me` | ✅ `authenticate` | `generalLimiter` (100/15m) | Returns the currently authenticated user |

### Auth Middleware (`src/middleware/auth.ts`)

**`authenticate`** — Verifies the `Bearer <token>` from the `Authorization` header using `jsonwebtoken.verify()`. On success, populates `req.user` with `{ id, role }`. Returns `401` if the token is missing, expired, or invalid.

**`authorize(...roles)`** — Restricts access to specific roles. Must be used after `authenticate`.

```ts
import { authenticate, authorize } from "../middleware/auth";

// Protect a route
router.get("/admin/dashboard", authenticate, authorize("admin"), handler);

// Use req.user.id and req.user.role inside the handler
```

### Auth Service (`src/services/auth.service.ts`)

Encapsulates all auth business logic:

- **`register(name, email, password)`** — Checks for duplicate email, hashes password via Mongoose pre-save hook, creates user, returns JWT.
- **`login(email, password)`** — Finds user (with password field selected), compares with bcrypt, returns JWT.
- Throws `AppError` with appropriate HTTP status codes (`409` for duplicate email, `401` for bad credentials).

### Password Storage (`src/models/user.model.ts`)

- Passwords are hashed with **bcryptjs** at **12 salt rounds** via a Mongoose `pre("save")` hook.
- The `password` field has `select: false` — it is excluded from all queries by default. Login explicitly uses `.select("+password")`.
- An instance method `comparePassword(candidatePassword)` handles comparison.

### JWT Configuration

| Env var | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-in-production` | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-in-production` | Secret for refresh tokens (reserved for future use) |
| `JWT_EXPIRES_IN` | `24h` | Token expiration duration (e.g., `15m`, `7d`, `24h`) |

> ⚠️ **Always change the JWT secrets in production.** Use strong, random values. Consider a secrets manager or env-injection at deploy time.

---

---

## Environment Variables Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-in-production` | No | JWT signing secret |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-in-production` | No | Refresh token secret |
| `JWT_EXPIRES_IN` | `24h` | No | Token expiration duration |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | No | Comma-separated allowed origins |
| `BODY_LIMIT` | `10kb` | No | Max request payload size |
| `RATE_LIMIT_WINDOW_MS` | `900000` | No | Rate limiter window (ms) |
| `RATE_LIMIT_MAX` | `100` | No | Max requests per window |
| `UPSTASH_REDIS_URL` | — | No | Upstash Redis REST URL (production) |
| `UPSTASH_REDIS_TOKEN` | — | No | Upstash Redis REST token |

---

## Recommended Production Hardening

1. **HTTPS enforcement** — Terminate TLS at a reverse proxy (Nginx, Caddy, Cloudflare). Set `helmet`'s `strictTransportSecurity` to a non-zero `maxAge`.

2. **CSRF protection** — If using cookie-based authentication (session cookies with JWT), add CSRF middleware like `csurf` or use `SameSite=Strict` cookies.

3. **Auth JWT** — The `authenticate` middleware is fully implemented with real JWT verification (`jsonwebtoken.verify()`). Ensure `JWT_ACCESS_SECRET` is set to a strong, unique value in production.

4. **Logging** — Ensure `winston` logs include `req.requestId` for audit trail correlation. See `src/utils/logger.ts`.

5. **Secrets management** — Never commit `.env` files. Use environment variables injected by your deployment platform (Vercel, Railway, Docker secrets, etc.).

6. **Dependency scanning** — Run `npm audit` regularly. Consider adding `snyk` or Dependabot to your CI pipeline.

---

## Reporting a Vulnerability

If you discover a security vulnerability, please open an issue or contact the repository maintainer directly. Do not disclose vulnerabilities publicly until they have been addressed.
