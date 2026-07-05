# oldhat.dev — Backend

Express.js + TypeScript backend serving [oldhat.dev](https://oldhat.dev). MySQL-backed with layered architecture following SOLID principles.

## Architecture

```
Request
  → Route (/api/v1/...)
    → Middleware (rate limiter, auth, request ID, validation)
      → Controller     (thin — validates input, calls service, sends response)
        → Service      (business logic, AppError for domain errors)
          → Repository Interface  (contract — OCP)
            → MysqlRepository     (type-safe mysql2 queries with RowDataPacket)
              → MySQL (socrates database)
```

### Dependency Flow

Composition Root (`src/composition-root.ts`) wires the entire graph:

```
MysqlRepository → Service → Controller
```

No controller or service instantiates its own dependencies — they receive them via constructor (DIP).

## Project Structure

```
src/
├── config/
│   ├── index.ts           # App configuration (env vars, required() validation)
│   └── database.ts        # MySQL pool (initDB, query, getConnection, closeDB)
├── controllers/
│   ├── base.controller.ts           # Base class: sendSuccess, sendError, validate, authorize
│   ├── interface.controller.ts      # CRUD interface contracts (Indexable, Storable, etc.)
│   ├── statistics.controller.ts     # Custom — visitor statistics endpoint
│   ├── auth.controller.ts           # Register, login, me
│   └── examples/
│       ├── health.controller.ts     # Simple singleton — no dependencies
│       └── user.controller.ts       # CRUD example implementing InterfaceController
├── middleware/
│   ├── auth.ts              # JWT verification + role guard
│   ├── errorHandler.ts      # Global error handler + 404
│   ├── rateLimiter.ts       # generalLimiter (100/15min) + authLimiter (15/15min)
│   ├── rateLimitStore.ts    # Placeholder — currently using express-rate-limit MemoryStore
│   ├── requestId.ts         # X-Request-Id header injection
│   └── validators/
│       ├── validate.ts      # Validation runner
│       └── user.validator.ts
├── models/
│   ├── index.ts             # Barrel export
│   ├── user.model.ts        # RowDataPacket types for `users` table
│   ├── daily_report.model.ts
│   ├── ip_hit.model.ts
│   ├── bot_activity.model.ts
│   ├── hourly_activity.model.ts
│   ├── path_activity.model.ts
│   └── status_activity.model.ts
├── repositories/
│   ├── index.ts             # Barrel export
│   ├── interfaces/
│   │   ├── IBaseRepository.ts         # Generic CRUD contract
│   │   ├── IUserRepository.ts         # User-specific queries (findOneByEmail)
│   │   └── IStatisticsRepository.ts   # Read-only statistics contract
│   └── mysql/
│       ├── BaseRepository.ts          # Generic CRUD implementation (5 operations)
│       ├── UserRepository.ts          # Extends BaseRepository for users
│       └── StatisticsRepository.ts    # Multi-table read queries for reports
├── routes/
│   └── index.ts             # Route registration (all API routes in one place)
├── services/
│   ├── user.service.ts      # User CRUD business logic
│   ├── auth.service.ts      # Authentication (register, login, JWT)
│   └── statistics.service.ts # Report queries with date validation
├── types/
│   ├── index.ts             # IApiResponse, ControllerMethod, IPaginationOptions
│   ├── user.types.ts        # ICreateUserDTO, IUpdateUserDTO
│   ├── statistics.types.ts  # VisitorsReportDTO, DailySummaryDTO, etc.
│   └── express.d.ts         # AuthenticatedRequest type extension
├── utils/
│   ├── appError.ts          # AppError class (message + statusCode)
│   └── logger.ts            # Winston logger
├── app.ts                   # Express app setup (helmet, cors, routes, error handling)
├── composition-root.ts      # One true place: wires repo → service → controller
└── server.ts                # Entry point: initDB → listen
```

## Key Patterns

### 1. Composition Root

All dependency wiring in one file — never spread across controllers or routes:

```typescript
// src/composition-root.ts
const userRepo = new MysqlUserRepository();
const statsRepo = new MysqlStatisticsRepository();

const userService = new UserService(userRepo);
const authService = new AuthService(userRepo);
const statisticsService = new StatisticsService(statsRepo);

const userController = new UserController(userService);
const authController = new AuthController(authService);
const statisticsController = new StatisticsController(statisticsService);

export { userController, authController, statisticsController };
```

### 2. Controller Types

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `extends BaseController implements InterfaceController` | Full CRUD resource | `UserController` |
| `extends BaseController implements Indexable, Showable` | Read-only resource | — |
| `extends BaseController` | Custom, non-CRUD endpoints | `HealthController`, `StatisticsController`, `AuthController` |

### 3. Response Methods (from BaseController)

| Method | HTTP Status |
|--------|-------------|
| `sendSuccess(res, data, message)` | 200 |
| `sendCreated(res, data, message)` | 201 |
| `sendNoContent(res)` | 204 |
| `sendBadRequest(res, message, errors?)` | 400 |
| `sendUnauthorized(res, message)` | 401 |
| `sendForbidden(res, message)` | 403 |
| `sendNotFound(res, message)` | 404 |
| `sendValidationError(res, errors, message)` | 422 |
| `sendServerError(res, error, message)` | 500 |

### 4. Models (RowDataPacket)

Each database table has a model file with two exports:

```typescript
// Plain row type — used by services and controllers
export interface IpHitRow {
  id: number;
  ip: string;
  country_code: string | null;
  // ...
}

// mysql2 RowDataPacket extension — used by repositories for type-safe queries
export interface IpHitRowPacket extends IpHitRow, RowDataPacket {}
```

Usage in repository:

```typescript
const rows = await query<IpHitRowPacket[]>(
  "SELECT * FROM ip_hits WHERE report_date = ?",
  [date],
);
// rows is typed as IpHitRowPacket[]
```

### 5. Services

- Stateless classes — all methods are async
- Throw `AppError` with a status code for domain errors
- Depend on repository **interfaces**, never on concrete implementations

```typescript
export class StatisticsService {
  constructor(private readonly statsRepo: IStatisticsRepository) {}

  async getVisitorsReport(date?: string): Promise<VisitorsReportDTO> {
    // validation...
    const report = await this.statsRepo.getReportByDate(reportDate);
    if (!report) throw new AppError(`No report data for ${reportDate}.`, 404);
    return report;
  }
}
```

### 6. Repositories

- **Interface first** — the service depends on the abstraction
- `MysqlBaseRepository` provides generic CRUD for single-table resources
- Custom repositories (like `StatisticsRepository`) handle multi-table reads

```typescript
// Interface (contract)
export interface IStatisticsRepository {
  getLatestReportDate(): Promise<string | null>;
  getReportByDate(date: string): Promise<VisitorsReportDTO | null>;
}

// Implementation (MySQL)
export class MysqlStatisticsRepository implements IStatisticsRepository {
  async getLatestReportDate(): Promise<string | null> { ... }
  async getReportByDate(date: string): Promise<VisitorsReportDTO | null> { ... }
}
```

### 7. Routes

All routes are registered in `src/routes/index.ts`:

```typescript
router.get("/health", healthController.check);
router.get("/statistics/visitors", generalLimiter, statisticsController.visitors);
```

Rate limiters (`generalLimiter`, `authLimiter`) are applied per-route in this file.

## API Endpoints

### Public (Rate-Limited)

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| `GET` | `/api/v1/health` | Health check | None |
| `GET` | `/api/v1/statistics/visitors?date=YYYY-MM-DD` | Daily visitor report | 100 req / 15 min |

### Protected (Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register user |
| `POST` | `/api/v1/auth/login` | Login |
| `GET` | `/api/v1/auth/me` | Current user |

## Database

- **MySQL** on localhost, database `socrates`
- Connection pool via `mysql2/promise` (10 connections, keep-alive enabled)
- Pool initialised in `server.ts` before Express starts listening

### Tables

| Table | Purpose | Populated By |
|-------|---------|-------------|
| `users` | User accounts | Express auth endpoints |
| `daily_reports` | Daily traffic aggregates | `oldhat_daily_report.py` (system crontab, 8AM PHT) |
| `ip_hits` | Per-IP breakdown with geo | Same |
| `bot_activity` | Bot species and hit volumes | Same |
| `hourly_activity` | 24-hour traffic heatmap | Same |
| `path_activity` | Per-path hits with threat categorisation | Same |
| `status_activity` | HTTP status code frequencies | Same |
| `archives` | Socrates archive system | `socrates.py` |
| `projects` | Project records | `socrates.py` |
| `user_profile` | User profile data | `socrates.py` |

## Development

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your DB credentials

# Development (hot-reload)
npm run dev

# Build and run
npm run build
npm start
```

## Deployment

```bash
git pull
npm install
npm run build
pm2 restart oldhatdev
```

Express runs on `127.0.0.1:3001` behind Nginx reverse proxy. PM2 manages the process lifecycle (`pm2 startup` for auto-restart on reboot).

## Security

- All credential env vars use `required()` — fail fast if missing
- JWT secrets are 64-char hex strings (rotated from dev defaults)
- No hardcoded passwords or secrets in source code
- Rate limiting on all public endpoints
- Helmet with CSP, HSTS
- CORS locked to oldhat.dev origins

## License

MIT
