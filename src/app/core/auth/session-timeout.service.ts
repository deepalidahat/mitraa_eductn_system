import { DOCUMENT, Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, filter, fromEvent, merge, startWith, switchMap, tap, throttleTime, timer } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from './auth.service';

const WARNING_MS = 60_000;

/**
 * Secure session handling:
 * - idle timeout (config.sessionTimeoutMinutes) with a one-minute warning,
 * - absolute token expiry,
 * - logout in one tab logs out every tab.
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(AppConfigService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  start(): void {
    const win = this.document.defaultView;
    if (!win) return;

    const activity$ = merge(
      fromEvent(this.document, 'pointerdown'),
      fromEvent(this.document, 'keydown'),
      fromEvent(this.document, 'scroll', { capture: true }),
    ).pipe(throttleTime(5_000));

    toObservable(this.auth.session)
      .pipe(
        switchMap((session) => {
          if (!session) return EMPTY;
          const idleMs = Math.max(this.config.config().sessionTimeoutMinutes * 60_000, WARNING_MS * 2);
          const idle$ = activity$.pipe(
            startWith(null),
            switchMap(() =>
              timer(idleMs - WARNING_MS).pipe(
                tap(() => this.toast.show('You will be signed out in 1 minute due to inactivity.', 'warning', WARNING_MS)),
                switchMap(() => timer(WARNING_MS)),
              ),
            ),
          );
          const absolute$ = timer(new Date(session.expiresAt));
          const otherTabLogout$ = fromEvent<StorageEvent>(win, 'storage').pipe(
            filter((e) => e.key === 'mitraa.session' && e.newValue === null && e.storageArea === win.localStorage),
          );
          return merge(idle$, absolute$, otherTabLogout$);
        }),
      )
      .subscribe(() => this.auth.logout('expired'));
  }
}
