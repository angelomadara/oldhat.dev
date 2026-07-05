import { UserRowPacket } from "../../models/user.model";
import { ICreateUserDTO, IUpdateUserDTO } from "../../types";
import { IBaseRepository } from "./IBaseRepository";

/**
 * Repository interface for User data access.
 *
 * Extends the generic IBaseRepository with User-specific types.
 * Any User-specific queries (findOneByEmail) live here, not in the base.
 */
export interface IUserRepository extends IBaseRepository<
  UserRowPacket,
  ICreateUserDTO,
  IUpdateUserDTO
> {
  findOneByEmail(email: string): Promise<UserRowPacket | null>;
}
