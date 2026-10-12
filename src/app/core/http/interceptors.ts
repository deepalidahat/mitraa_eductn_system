import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';
import { LoadingService } from '../services/loading.service';
import { ToastService } from '../services/toast.service';
import { toApiError } from './api-error';
import { SILENT_REQUEST } from './http-context';

const isApi = (url: string) => url.startsWith(environment.apiBaseUrl);
const isAuthEndpoint = (url: string) => url.includes('/auth/');

/** Attaches the bearer token and tenant to API calls. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthService).session();
  if (!session || !isApi(req.url)) return next(req);
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${session.token}`, 'X-Tenant-Id': session.user.tenantId },
    }),
  );
};

/** Global progress indicator for user-initiated requests. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SILENT_REQUEST)) return next(req);
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

/**
 * Cross-cutting error handling:
 * - 401 on a protected call -> session ended, sign out and clear client data
 * - network / server errors -> toast
 * Validation (4xx) and permission (403) errors are left to the screen to show inline.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && !req.context.get(SILENT_REQUEST)) {
        if (err.status === 401 && !isAuthEndpoint(req.url) && auth.isAuthenticated()) {
          auth.logout('expired');
        } else if (err.status === 0 || err.status >= 500) {
          toast.error(toApiError(err).message);
        }
      }
      return throwError(() => err);
    }),
  );
};
