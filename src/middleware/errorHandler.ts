import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../utils/appError";

/**
 * Global error-handling middleware.
 * Catches all errors thrown (or passed via next(error)) in the request pipeline.
 * Respects AppError.statusCode for custom error responses.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  res.status(500).json({ success: false, message: err.message || "Internal server error" });
}

/**
 * 404 handler — catches unmatched routes.
 */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Route not found" });
}
