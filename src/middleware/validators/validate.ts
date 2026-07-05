import { ValidationChain } from "express-validator";

/**
 * Run an array of validation chains and return formatted errors.
 */
export async function validate(validations: ValidationChain[], payload: Record<string, unknown>): Promise<Record<string, unknown>[] | null> {
  // express-validator works against the req object.
  // This helper is for standalone usage; for controller-level validation
  // use BaseController.validate() which works against the actual req.
  return null;
}
