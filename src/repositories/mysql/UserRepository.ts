import { RowDataPacket } from "mysql2/promise";
import { UserRowPacket } from "../../models/user.model";
import { ICreateUserDTO, IUpdateUserDTO } from "../../types";
import { MysqlBaseRepository } from "./BaseRepository";
import { IUserRepository } from "../interfaces/IUserRepository";
import { query } from "../../config/database";

/**
 * MySQL-backed implementation of IUserRepository.
 *
 * Extends MysqlBaseRepository to inherit all 5 CRUD operations.
 * Entity-specific queries (findOneByEmail) live here.
 *
 * OCP: The services depend on IUserRepository (abstraction),
 * not on this concrete class. Swap the implementation anytime.
 */
export class MysqlUserRepository
  extends MysqlBaseRepository<UserRowPacket, UserRowPacket, ICreateUserDTO, IUpdateUserDTO>
  implements IUserRepository
{
  constructor() {
    super("users");
  }

  async findOneByEmail(email: string): Promise<UserRowPacket | null> {
    const rows = await query<UserRowPacket[] & RowDataPacket[]>(
      "SELECT * FROM `users` WHERE `email` = ?",
      [email],
    );
    return rows[0] ?? null;
  }
}

export default MysqlUserRepository;
