import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import { AuthenticatedRequest } from "../types/express";

/**
 * Auth middleware — verifies JWT access token from the Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as { id: string; role: string };
    authReq.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? "Token expired" : "Invalid token";
    res.status(401).json({ success: false, message });
  }
}

/**
 * Role-based authorization middleware.
 * Must be used after authenticate().
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
