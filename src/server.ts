import app from "./app";
import config from "./config";
import { initDB } from "./config/database";
import logger from "./utils/logger";

async function start(): Promise<void> {
  // Connect to MySQL first
  await initDB();

  // Then start Express server — localhost only
  app.listen(config.port, config.host, () => {
    logger.info(`Server running on ${config.host}:${config.port} [${config.nodeEnv}]`);
    logger.info(`API base: ${config.apiPrefix}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
