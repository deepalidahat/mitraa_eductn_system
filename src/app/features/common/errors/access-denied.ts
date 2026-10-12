import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { Icon } from '@shared/ui';

@Component({
  selector: 'app-access-denied',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './error-page.scss',
  template: `
    <section class="error" role="alert">
      <span class="error__icon"><app-icon name="lock" [size]="34" /></span>
      <h1>{{ phase2() ? 'Coming in Phase 2' : 'Access denied' }}</h1>
      <p class="muted">
        @if (phase2()) {
          Exam Controller features will be switched on when Phase 2 is released.
        } @else {
          You don't have permission to open this page. If you think this is a mistake, contact your school administrator.
        }
      </p>
      <a class="btn btn--primary" [routerLink]="home()">Go to my dashboard</a>
    </section>
  `,
})
export class AccessDenied {
  private readonly auth = inject(AuthService);
  readonly reason = input<string>();
  protected readonly phase2 = computed(() => this.reason() === 'phase2');
  protected readonly home = computed(() => (this.auth.isAuthenticated() ? this.auth.homeUrl() : '/'));
}
