import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { Icon } from '@shared/ui';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './error-page.scss',
  template: `
    <section class="error">
      <span class="error__icon"><app-icon name="search" [size]="34" /></span>
      <h1>Page not found</h1>
      <p class="muted">The page you're looking for doesn't exist or has moved.</p>
      <a class="btn btn--primary" [routerLink]="home()">Take me home</a>
    </section>
  `,
})
export class NotFound {
  private readonly auth = inject(AuthService);
  protected readonly home = computed(() => (this.auth.isAuthenticated() ? this.auth.homeUrl() : '/'));
}
