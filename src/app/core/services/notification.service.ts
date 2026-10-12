import { DOCUMENT, Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, distinctUntilChanged, filter, fromEvent, merge, of, startWith, switchMap, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiService } from '../http/api.service';
import { silent } from '../http/http-context';
import { AppNotification } from '../models';

const POLL_MS = 60_000;

/** Notification bell: polls while the tab is visible, resets on logout. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly refresh$ = new Subject<void>();

  readonly items = toSignal(
    toObservable(computed(() => this.auth.user()?.id ?? null)).pipe(
      distinctUntilChanged(),
      switchMap((userId) => {
        if (!userId) return of<AppNotification[]>([]);
        const visible$ = fromEvent(this.document, 'visibilitychange').pipe(filter(() => this.document.visibilityState === 'visible'));
        return merge(timer(0, POLL_MS), visible$, this.refresh$).pipe(
          filter(() => this.document.visibilityState !== 'hidden'),
          switchMap(() =>
            this.api
              .list<AppNotification>('notifications', { _sort: 'at', _order: 'desc' }, silent())
              .pipe(catchError(() => of<AppNotification[] | null>(null))),
          ),
          filter((list): list is AppNotification[] => list !== null),
          startWith<AppNotification[]>([]),
        );
      }),
    ),
    { initialValue: [] as AppNotification[] },
  );

  readonly unread = computed(() => this.items().filter((n) => !n.read).length);

  refresh(): void {
    this.refresh$.next();
  }

  markRead(id: string): void {
    this.api.patch(`notifications/${id}`, { read: true }).subscribe({ next: () => this.refresh(), error: () => undefined });
  }

  markAllRead(): void {
    const unread = this.items().filter((n) => !n.read);
    if (!unread.length) return;
    merge(...unread.map((n) => this.api.patch(`notifications/${n.id}`, { read: true })))
      .pipe(catchError(() => of(null)))
      .subscribe({ complete: () => this.refresh() });
  }
}
