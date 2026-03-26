import type {
  UserResponse,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  HealthResponse,
  MetricsResponse,
  PaginationQuery,
  ApiError,
} from '@agent-first-stack/shared';

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const token = localStorage.getItem('auth_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        error: response.statusText,
        message: 'An unexpected error occurred',
      }));
      throw error;
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ─── Health ──────────────────────────────────────────────────────────────────
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async getMetrics(): Promise<MetricsResponse> {
    return this.request<MetricsResponse>('/metrics');
  }

  // ─── Users ───────────────────────────────────────────────────────────────────
  async getUsers(params?: PaginationQuery): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return this.request<UserListResponse>(`/api/users${query ? `?${query}` : ''}`);
  }

  async getUser(id: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/api/users/${id}`);
  }

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
