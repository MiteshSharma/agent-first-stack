import { UserRepository } from '../repositories/user.repository';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListResponse,
} from '@agent-first-stack/shared';

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async list(page: number, limit: number, search?: string): Promise<UserListResponse> {
    const [users, total] = await this.userRepo.findAll(page, limit, search);
    return {
      data: users.map((user) => this.toResponse(user)),
      total,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<UserResponse | null> {
    const user = await this.userRepo.findById(id);
    return user ? this.toResponse(user) : null;
  }

  async create(data: CreateUserRequest): Promise<UserResponse> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new ServiceError('User with this email already exists', 409);
    }

    const user = await this.userRepo.create({
      email: data.email,
      name: data.name,
    });

    return this.toResponse(user);
  }

  async update(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    const existing = await this.userRepo.findById(id);
    if (!existing) {
      throw new ServiceError('User not found', 404);
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await this.userRepo.findByEmail(data.email);
      if (emailTaken) {
        throw new ServiceError('Email already in use', 409);
      }
    }

    const updated = await this.userRepo.update(id, data);
    if (!updated) {
      throw new ServiceError('User not found', 404);
    }

    return this.toResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepo.delete(id);
    if (!deleted) {
      throw new ServiceError('User not found', 404);
    }
  }

  private toResponse(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
