import { IPaginationOptions } from "../../types";

/**
 * Generic base repository interface.
 *
 * CLOSED for modification — the CRUD contract never changes.
 * OPEN for extension — domain interfaces extend this with
 * entity-specific queries (e.g. findOneByEmail).
 *
 * @template T        Document type (e.g. UserDocument)
 * @template CreateDTO  DTO for creating (defaults to Partial<T>)
 * @template UpdateDTO  DTO for updating (defaults to Partial<T>)
 */
export interface IBaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  findAll(options: IPaginationOptions): Promise<{ items: T[]; total: number }>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<void>;
}
