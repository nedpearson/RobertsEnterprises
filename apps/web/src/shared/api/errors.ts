export interface AppError {
  code: string;
  message: string;
  status?: number;
  fieldErrors?: Record<string, string>;
  correlationId?: string;
  retryable: boolean;
  original?: unknown;
}

export function isAppError(err: any): err is AppError {
  return err && typeof err.code === 'string' && typeof err.message === 'string';
}

export function normalizeError(error: any): AppError {
  if (isAppError(error)) {
    return error;
  }

  // Handle standard HTTP response errors
  if (error instanceof Response) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || 'An unexpected HTTP error occurred.',
      status: error.status,
      retryable: error.status >= 500 || error.status === 429,
      original: error,
    };
  }

  // Handle generic JavaScript Error objects
  if (error instanceof Error) {
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      retryable: true,
      original: error,
    };
  }

  // Fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error || 'An unknown network error occurred.'),
    retryable: true,
    original: error,
  };
}
