import { Request, Response } from "express";
import BaseController from "./base.controller";
import { AuthService } from "../services/auth.service";
import { AuthenticatedRequest } from "../types/express";

/**
 * Authentication controller — register, login, and current-user endpoints.
 * Receives its service dependency via constructor (DIP).
 */
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * POST /auth/register
   */
  register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return this.sendBadRequest(res, "Name, email, and password are required");
      }
      if (password.length < 6) {
        return this.sendBadRequest(res, "Password must be at least 6 characters");
      }

      const result = await this.authService.register(name, email, password);
      return this.sendCreated(res, result, "Registration successful");
    } catch (error) {
      if (error instanceof Error) {
        return this.sendError(res, error.message, (error as any).statusCode || 500);
      }
      return this.sendServerError(res, error, "Registration failed");
    }
  };

  /**
   * POST /auth/login
   */
  login = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return this.sendBadRequest(res, "Email and password are required");
      }

      const result = await this.authService.login(email, password);
      return this.sendSuccess(res, result, "Login successful");
    } catch (error) {
      if (error instanceof Error) {
        return this.sendError(res, error.message, (error as any).statusCode || 500);
      }
      return this.sendServerError(res, error, "Login failed");
    }
  };

  /**
   * GET /auth/me
   * Returns the currently authenticated user.
   */
  me = async (req: Request, res: Response): Promise<Response> => {
    try {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        return this.sendUnauthorized(res, "Not authenticated");
      }

      const user = await this.authService.getUserById(authReq.user.id);

      if (!user) {
        return this.sendNotFound(res, "User not found");
      }

      return this.sendSuccess(res, user, "User retrieved successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve user");
    }
  };
}
