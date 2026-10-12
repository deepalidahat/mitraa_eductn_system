import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { AppConfig, DEFAULT_APP_CONFIG } from '../models';

/** Runtime feature flags and policy (registration, OTP, payments, Phase 2, session timeout). */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly api = inject(ApiService);
  private readonly _config = signal<AppConfig>(DEFAULT_APP_CONFIG);
  readonly config = this._config.asReadonly();

  /** Called once by the app initializer; never fails the bootstrap. */
  load(): Observable<AppConfig> {
    return this.api.get<AppConfig>('config').pipe(
      map((cfg) => ({ ...DEFAULT_APP_CONFIG, ...cfg })),
      catchError(() => of(DEFAULT_APP_CONFIG)),
      tap((cfg) => this._config.set(cfg)),
    );
  }
}
