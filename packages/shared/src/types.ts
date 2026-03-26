// ─── Health & Metrics ────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  database: string;
  redis: string;
  uptime: number;
  responseTime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

export interface MetricsResponse {
  database: Record<string, number>;
  cache: {
    hits: number;
    misses: number;
    keys: number;
  };
  process: {
    pid: number;
    uptime: number;
    nodeVersion: string;
  };
}

// ─── User Entity ─────────────────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, string[]>;
}
