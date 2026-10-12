import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  message: string;
}

const FALLBACK: Record<number, string> = {
  0: 'Unable to reach the server. Check your connection and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to access this.',
  404: 'We could not find what you were looking for.',
  500: 'Something went wrong on our side. Please try again.',
};

/** Normalizes any thrown value into a predictable { status, message }. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message : FALLBACK[err.status] ?? FALLBACK[500];
    return { status: err.status, message };
  }
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    return err as ApiError;
  }
  return { status: -1, message: err instanceof Error ? err.message : FALLBACK[500] };
}
