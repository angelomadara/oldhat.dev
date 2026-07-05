import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { IPaginationOptions } from "../../types";
import { IBaseRepository } from "../interfaces/IBaseRepository";
import { query } from "../../config/database";

/**
 * Generic MySQL-backed base repository.
 *
 * Implements the 5 standard CRUD operations for any MySQL table.
 * Domain repositories extend this and only override or add
 * entity-specific methods (e.g. findOneByEmail).
 *
 * @template T        Row type (e.g. UserRow)
 * @template TPacket  RowDataPacket type for mysql2 mapping
 * @template CreateDTO  DTO for creating
 * @template UpdateDTO  DTO for updating
 */
export abstract class MysqlBaseRepository<
  T extends { id: number },
  TPacket extends RowDataPacket,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>,
> implements IBaseRepository<T, CreateDTO, UpdateDTO>
{
  constructor(
    protected readonly tableName: string,
    protected readonly idColumn: string = "id",
  ) {}

  async findAll(options: IPaginationOptions): Promise<{ items: T[]; total: number }> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const rows = await query<TPacket[] & RowDataPacket[]>(
      `SELECT * FROM \`${this.tableName}\` ORDER BY ${this.idColumn} DESC LIMIT ? OFFSET ?`,
      [String(limit), String(offset)],
    );

    const countResult = await query<RowDataPacket[] & RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM \`${this.tableName}\``,
    );

    return {
      items: rows as unknown as T[],
      total: (countResult[0] as any)?.total ?? 0,
    };
  }

  async findById(id: string): Promise<T | null> {
    const rows = await query<TPacket[] & RowDataPacket[]>(
      `SELECT * FROM \`${this.tableName}\` WHERE \`${this.idColumn}\` = ?`,
      [id],
    );
    return (rows[0] as unknown as T) ?? null;
  }

  async create(data: CreateDTO): Promise<T> {
    const keys = Object.keys(data as object);
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.map((k) => `\`${k}\``).join(", ");
    const values = Object.values(data as object);

    const result = await query<ResultSetHeader>(
      `INSERT INTO \`${this.tableName}\` (${columns}) VALUES (${placeholders})`,
      values,
    );

    return (await this.findById(String(result.insertId))) as T;
  }

  async update(id: string, data: UpdateDTO): Promise<T | null> {
    const keys = Object.keys(data as object);
    if (keys.length === 0) return this.findById(id);

    const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const values = Object.values(data as object);

    await query<ResultSetHeader>(
      `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`${this.idColumn}\` = ?`,
      [...values, id],
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await query<ResultSetHeader>(
      `DELETE FROM \`${this.tableName}\` WHERE \`${this.idColumn}\` = ?`,
      [id],
    );
  }
}

export default MysqlBaseRepository;
