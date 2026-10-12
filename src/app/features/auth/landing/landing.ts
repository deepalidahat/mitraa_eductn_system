import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppConfigService } from '@core/services/app-config.service';
import { Icon } from '@shared/ui';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="copy">
        <span class="eyebrow"><app-icon name="landmark" [size]="16" /> Welcome to</span>
        <h1>{{ config().appName }}</h1>
        <p class="lead">{{ config().tagline }}</p>
        <p class="muted">
          One place for assignments, exams, practice, communication and academic reporting — with a journey shaped
          around students, teachers, parents, principals and management.
        </p>
        <div class="cta">
          <a routerLink="/select-role" class="btn btn--primary btn--lg">Login <app-icon name="arrow-right" [size]="18" /></a>
          @if (config().registrationEnabled) {
            <a routerLink="/register" class="btn btn--lg">Sign Up / Register</a>
          }
        </div>
        <ul class="trust" aria-label="Highlights">
          <li><app-icon name="shield" [size]="18" /> Role-based secure access</li>
          <li><app-icon name="accessibility" [size]="18" /> WCAG 2.2 accessibility</li>
          <li><app-icon name="globe" [size]="18" /> Web portal & mobile</li>
        </ul>
      </div>
      <img class="art" src="assets/images/hero-campus.svg" alt="" width="480" height="360" />
    </section>
  `,
  styles: `
    .hero { display: grid; gap: var(--sp-8); align-items: center; max-width: 1120px; margin: auto; width: 100%; }
    @media (min-width: 900px) { .hero { grid-template-columns: 1.1fr 1fr; } }
    .copy { display: grid; gap: var(--sp-4); }
    .eyebrow { display: inline-flex; align-items: center; gap: var(--sp-2); width: fit-content; padding: var(--sp-1) var(--sp-3); border-radius: var(--radius-pill); background: var(--c-primary-soft); color: var(--c-primary); font-weight: 700; font-size: var(--fs-sm); }
    h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 800; letter-spacing: -0.03em; color: var(--c-brand); }
    :host-context([data-theme='dark']) h1 { color: var(--c-text); }
    .lead { font-size: var(--fs-xl); font-weight: 600; }
    .muted { max-width: 52ch; }
    .cta { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-2); }
    .btn--lg { min-height: 50px; padding: 0 var(--sp-6); font-size: var(--fs-md); }
    .trust { display: flex; flex-wrap: wrap; gap: var(--sp-4); margin: var(--sp-4) 0 0; padding: 0; list-style: none; font-size: var(--fs-sm); color: var(--c-text-muted); }
    .trust li { display: inline-flex; align-items: center; gap: var(--sp-2); }
    .art { width: 100%; height: auto; filter: drop-shadow(0 24px 40px rgb(11 44 95 / 18%)); }
  `,
})
export class Landing {
  protected readonly config = inject(AppConfigService).config;
}
