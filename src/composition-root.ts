/**
 * Composition Root
 *
 * The single place in the application where all dependencies are
 * wired together (repository → service → controller).
 *
 * This is the "one true place" that changes when you swap an
 * implementation — confirming OCP across the whole dependency graph.
 */
import { MysqlUserRepository, MysqlStatisticsRepository } from "./repositories";
import { UserService } from "./services/user.service";
import { AuthService } from "./services/auth.service";
import { StatisticsService } from "./services/statistics.service";
import { UserController } from "./controllers/examples/user.controller";
import { AuthController } from "./controllers/auth.controller";
import { StatisticsController } from "./controllers/statistics.controller";

// ── Repositories ────────────────────────────────────
const userRepo = new MysqlUserRepository();
const statsRepo = new MysqlStatisticsRepository();

// ── Services ─────────────────────────────────────────
const userService = new UserService(userRepo);
const authService = new AuthService(userRepo);
const statisticsService = new StatisticsService(statsRepo);

// ── Controllers ──────────────────────────────────────
const userController = new UserController(userService);
const authController = new AuthController(authService);
const statisticsController = new StatisticsController(statisticsService);

export { userController, authController, statisticsController };
