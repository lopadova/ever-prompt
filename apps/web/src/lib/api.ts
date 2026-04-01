import type { ApiResponse, ApiError } from '@everprompt/shared';

const BASE_URL = '/api/v1';

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`, window.location.origin);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok || (json as ApiError).ok === false) {
      const err = json as ApiError;
      throw new ApiClientError(
        err.error?.message ?? 'Unknown error',
        err.error?.code ?? 'UNKNOWN',
        res.status,
        err.error?.details,
      );
    }

    return (json as ApiResponse<T>).data;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T = void>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const api = new ApiClient();
