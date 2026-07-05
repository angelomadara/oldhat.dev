import { Request, Response } from "express";
import BaseController from "../base.controller";
import { UserService } from "../../services/user.service";
import { ControllerMethod } from "../../types";
import { InterfaceController } from "../interface.controller";

/**
 * Full CRUD controller example — uses the composite InterfaceController.
 *
 * Receives its service dependency via constructor (DIP).
 * The service itself receives a repository abstraction (OCP + DIP).
 */
export class UserController extends BaseController implements InterfaceController {
  constructor(private readonly userService: UserService) {
    super();
  }

  index: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || parseInt(process.env.PAGE_LIMIT || "10");
      const { items, total } = await this.userService.getAllUsers({ page, limit });
      return this.sendSuccess(res, { items, pagination: { page, limit, total } }, "Users retrieved successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve users");
    }
  };

  show: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) return this.sendNotFound(res, "User not found");
      return this.sendSuccess(res, user, "User retrieved successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve user");
    }
  };

  store: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.createUser(req.body);
      return this.sendCreated(res, user, "User created successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to create user");
    }
  };

  edit: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) return this.sendNotFound(res, "User not found");
      return this.sendSuccess(res, user, "User retrieved for editing");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to retrieve user");
    }
  };

  update: ControllerMethod = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.updateUser(req.params.id, req.body);
      if (!user) return this.sendNotFound(res, "User not found");
      return this.sendSuccess(res, user, "User updated successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to update user");
    }
  };

  destroy: ControllerMethod = async (req: Request, res: Response) => {
    try {
      await this.userService.deleteUser(req.params.id);
      return this.sendSuccess(res, null, "User deleted successfully");
    } catch (error) {
      return this.sendServerError(res, error, "Failed to delete user");
    }
  };
}
