import type { PaginatedResponse } from './types';

export function getPaginatedData<T>(response: PaginatedResponse<T> | T[] | null | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  return [];
}
