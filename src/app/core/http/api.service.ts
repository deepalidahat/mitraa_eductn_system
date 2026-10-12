import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

type ParamValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type QueryParams = Record<string, ParamValue>;

interface RequestOptions {
  params?: QueryParams;
  context?: HttpContext;
}

/**
 * Thin, typed wrapper over HttpClient for the REST API.
 * Resources map 1:1 to backend collections (json-server in development).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list<T>(resource: string, params?: QueryParams, context?: HttpContext): Observable<T[]> {
    return this.http.get<T[]>(this.url(resource), { params: toParams(params), context });
  }

  get<T>(path: string, opts: RequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toParams(opts.params), context: opts.context });
  }

  post<T>(path: string, body: unknown, opts: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body, { params: toParams(opts.params), context: opts.context });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }
}

function toParams(params?: QueryParams): HttpParams | undefined {
  if (!params) return undefined;
  let hp = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => (hp = hp.append(key, String(v))));
    } else {
      hp = hp.set(key, String(value));
    }
  }
  return hp;
}
