import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '@core/models';
import { NotificationService } from '@core/services/notification.service';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, PageHeader } from '@shared/ui';

@Component({
  selector: 'app-notifications-page',
  imports: [PageHeader, Icon, RelativeTimePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Notifications" [subtitle]="svc.unread() + ' unread'">
        <button type="button" class="btn" (click)="svc.markAllRead()" [disabled]="!svc.unread()"><app-icon name="check" [size]="16" /> Mark all read</button>
      </app-page-header>
      <section class="card">
        <ul class="list">
          @for (n of svc.items(); track n.id) {
            <li>
              <button type="button" class="list-row list-row--link" (click)="open(n)">
                <span class="icon-tile"><app-icon [name]="n.read ? 'bell' : 'info'" [size]="18" /></span>
                <span class="list-row__body">
                  <span class="list-row__title" [class.fw-700]="!n.read">{{ n.text }}</span>
                  <span class="list-row__meta" [title]="n.at | date: 'medium'">{{ n.at | relativeTime }}</span>
                </span>
                @if (!n.read) {
                  <span class="badge badge--info">New</span>
                }
              </button>
            </li>
          } @empty {
            <li class="muted">You're all caught up.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class NotificationsPage {
  private readonly router = inject(Router);
  protected readonly svc = inject(NotificationService);

  constructor() {
    this.svc.refresh();
  }

  protected open(n: AppNotification): void {
    if (!n.read) this.svc.markRead(n.id);
    void this.router.navigateByUrl(n.link);
  }
}
