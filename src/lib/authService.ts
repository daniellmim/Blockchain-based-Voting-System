import type { User } from './types';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const loginUser = async (email: string, password?: string): Promise<{ token: string; user: User }> => {
  if (!password) throw new Error("Password is required for login.");
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('bvs_token', data.token);
  }
  return data; // { token, user }
};

export const signupUser = async (name?: string, username?: string, email?: string, password?: string): Promise<{ token?: string; user?: User; suggestions?: string[] }> => {
  if (!name || !username || !email || !password) {
    throw new Error("Name, username, email, and password are required for signup.");
  }
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    // If suggestions are present, throw a custom error object
    if (response.status === 409 && data.suggestions) {
      const err: any = new Error(data.message || 'Signup failed');
      err.suggestions = data.suggestions;
      throw err;
    }
    throw new Error(data.message || 'Signup failed');
  }
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('bvs_token', data.token);
  }
  return data; // { token, user, suggestions? }
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bvs_token');
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bvs_token', token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('bvs_token');
};
