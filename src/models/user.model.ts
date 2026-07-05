import { RowDataPacket } from "mysql2/promise";

/**
 * User model — plain TypeScript interface (no Mongoose).
 * Maps to the `users` table in MySQL.
 */
export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  created_at: Date;
  updated_at: Date;
}

/**
 * Row type for MySQL queries — extends RowDataPacket so mysql2
 * can map results to it.
 */
export interface UserRowPacket extends UserRow, RowDataPacket {}

export default UserRow;
