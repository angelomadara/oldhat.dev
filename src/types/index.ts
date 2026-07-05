export * from "./user.types";

// ── API Response ──────────────────────────────────
export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: unknown[];
}

// ── Controller Method Type ────────────────────────
import { Request, Response, NextFunction } from "express";
export type ControllerMethod = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response> | void | Response;

// ── Pagination ────────────────────────────────────
export interface IPaginationOptions {
  page: number;
  limit: number;
}
