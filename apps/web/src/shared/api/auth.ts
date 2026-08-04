import { requestClient } from './client';

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    role: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return requestClient<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

export async function demoLogin(): Promise<LoginResponse> {
  return requestClient<LoginResponse>('/demo-login', {
    method: 'POST',
    skipAuth: true,
  });
}
