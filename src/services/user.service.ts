import { UserRow } from "../models/user.model";
import { ICreateUserDTO, IUpdateUserDTO, IPaginationOptions } from "../types";
import { IUserRepository } from "../repositories";

/**
 * UserService
 * Business logic layer — stateless class that encapsulates
 * all user data operations via an injected repository.
 *
 * OCP: The service depends on IUserRepository (abstraction),
 * not on any specific DB implementation.
 */
export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getAllUsers(options: IPaginationOptions): Promise<{ items: UserRow[]; total: number }> {
    return this.userRepo.findAll(options);
  }

  async getUserById(id: string): Promise<UserRow | null> {
    return this.userRepo.findById(id);
  }

  async createUser(data: ICreateUserDTO): Promise<UserRow> {
    return this.userRepo.create(data);
  }

  async updateUser(id: string, data: IUpdateUserDTO): Promise<UserRow | null> {
    return this.userRepo.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }
}

export default UserService;
