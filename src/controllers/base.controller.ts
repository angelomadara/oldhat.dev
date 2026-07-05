import { Request, Response, RequestHandler } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { IApiResponse } from "../types";

/**
 * Base Controller
 * Provides common functionality for all controllers:
 *   - Request validation  (validate)
 *   - Authorization check (authorize)
 *   - Standardised responses (sendSuccess, sendCreated, sendError, sendNotFound, sendServerError, etc.)
 */
export default class BaseController {
  protected middlewares: RequestHandler[] = [];

  protected middleware(...middleware: RequestHandler[]): void {
    this.middlewares.push(...middleware);
  }

  public getMiddlewares(): RequestHandler[] {
    return this.middlewares;
  }

  protected async validate(req: Request, validations: ValidationChain[]): Promise<unknown[] | null> {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errors.array();
    return null;
  }

  protected authorize(condition: boolean, message: string = "Unauthorized"): void {
    if (!condition) throw new Error(message);
  }

  // ── Response Methods ──────────────────────────────────

  protected sendSuccess<T>(res: Response, data: T, message: string = "Success", statusCode: number = 200): Response {
    return res.status(statusCode).json({ success: true, message, data } as IApiResponse<T>);
  }

  protected sendCreated<T>(res: Response, data: T, message: string = "Created successfully"): Response {
    return this.sendSuccess(res, data, message, 201);
  }

  protected sendNoContent(res: Response): Response {
    return res.status(204).send();
  }

  protected sendError(res: Response, message: string, statusCode: number = 500, errors?: unknown[]): Response {
    const response: IApiResponse = { success: false, message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  protected sendBadRequest(res: Response, message: string = "Bad request", errors?: unknown[]): Response {
    return this.sendError(res, message, 400, errors);
  }

  protected sendUnauthorized(res: Response, message: string = "Unauthorized"): Response {
    return this.sendError(res, message, 401);
  }

  protected sendForbidden(res: Response, message: string = "Forbidden"): Response {
    return this.sendError(res, message, 403);
  }

  protected sendNotFound(res: Response, message: string = "Resource not found"): Response {
    return this.sendError(res, message, 404);
  }

  protected sendValidationError(res: Response, errors: unknown[], message: string = "Validation failed"): Response {
    return this.sendError(res, message, 422, errors);
  }

  protected sendServerError(res: Response, error: unknown, fallbackMessage: string = "Internal server error"): Response {
    if (error instanceof Error) {
      console.error(error.message, error.stack);
      return this.sendError(res, error.message, 500);
    }
    console.error(fallbackMessage, error);
    return this.sendError(res, fallbackMessage, 500);
  }
}
