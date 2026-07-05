import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../config";
import { AppError } from "../utils/appError";
import { IUserRepository } from "../repositories";
import { UserRow } from "../models/user.model";

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: Pick<UserRow, "id" | "name" | "email" | "role">;
  tokens: AuthTokens;
}

/**
 * AuthService
 * Handles user registration, login, and token generation.
 *
 * OCP: Depends on IUserRepository (abstraction) for data access.
 * DIP: Both service and repository implement the same interface contract.
 */
export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  /**
   * Register a new user.
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.userRepo.create({ name, email, password: hashedPassword });

    const accessToken = this.generateToken(user);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken },
    };
  }

  /**
   * Authenticate a user with email and password.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.userRepo.findOneByEmail(email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = this.generateToken(user);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken },
    };
  }

  /**
   * Generate a signed JWT access token.
   */
  private generateToken(user: UserRow): string {
    return jwt.sign(
      { id: user.id, role: user.role },
      config.jwtAccessSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions,
    );
  }

  /**
   * Get a user by ID (for the /auth/me endpoint).
   */
  async getUserById(id: string): Promise<UserRow | null> {
    return this.userRepo.findById(id);
  }
}

export default AuthService;
