import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLES } from '@core/models';
import { AppConfigService } from '@core/services/app-config.service';
import { Icon } from '@shared/ui';

/**
 * Step 2 - Select User Type. Only sets the sign-in context; the role itself is
 * verified by the backend after login.
 */
@Component({
  selector: 'app-role-select',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wrap">
      <header class="head">
        <h1>Select User Type</h1>
        <p class="muted">Choose how you'd like to sign in.</p>
      </header>

      @if (reason() === 'expired') {
        <p class="alert alert--warning" role="status"><app-icon name="clock" [size]="18" /> Your session ended. Please sign in again.</p>
      }

      <ul class="roles">
        @for (r of roles(); track r.role) {
          <li [attr.data-role]="r.role">
            @if (r.disabled) {
              <div class="role card is-disabled" aria-disabled="true">
                <span class="icon-tile"><app-icon [name]="r.icon" /></span>
                <span class="body">
                  <span class="name">{{ r.label }} <span class="badge">Future · Phase 2</span></span>
                  <span class="desc">{{ r.description }}</span>
                </span>
              </div>
            } @else {
              <a class="role card card--interactive" [routerLink]="['/login', r.path]" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}">
                <span class="icon-tile"><app-icon [name]="r.icon" /></span>
                <span class="body">
                  <span class="name">{{ r.label }}</span>
                  <span class="desc">{{ r.description }}</span>
                </span>
                <app-icon name="chevron-right" class="chev" />
              </a>
            }
          </li>
        }
      </ul>
      <a routerLink="/" class="text-sm back"><app-icon name="arrow-left" [size]="16" /> Back to welcome</a>
    </section>
  `,
  styles: `
    .wrap { display: grid; gap: var(--sp-5); width: min(760px, 100%); margin: auto; }
    .head { text-align: center; display: grid; gap: var(--sp-1); }
    .roles { display: grid; gap: var(--sp-3); margin: 0; padding: 0; list-style: none; }
    @media (min-width: 680px) { .roles { grid-template-columns: 1fr 1fr; } }
    .role { display: flex; align-items: center; gap: var(--sp-4); height: 100%; padding: var(--sp-4); color: var(--c-text); text-decoration: none; }
    .role:hover { color: var(--c-text); }
    .body { display: grid; flex: 1; gap: 2px; }
    .name { font-weight: 700; display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center; }
    .desc { font-size: var(--fs-sm); color: var(--c-text-muted); }
    .chev { color: var(--c-text-subtle); }
    .is-disabled { opacity: 0.6; cursor: not-allowed; }
    .back { display: inline-flex; align-items: center; gap: var(--sp-1); justify-self: center; }
  `,
})
export class RoleSelect {
  private readonly config = inject(AppConfigService).config;
  readonly reason = input<string>();
  readonly returnUrl = input<string>();

  protected readonly roles = computed(() =>
    ROLES.map((r) => ({ ...r, disabled: !!r.phase2 && !this.config().phase2Enabled })),
  );
}
