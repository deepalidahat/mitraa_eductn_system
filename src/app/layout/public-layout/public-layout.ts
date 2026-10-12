import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppConfigService } from '@core/services/app-config.service';
import { PreferencesService } from '@core/services/preferences.service';
import { Icon } from '@shared/ui';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <a routerLink="/" class="brand" aria-label="MiTRAA-Edu home">
        <img src="assets/images/logo.svg" alt="" width="36" height="36" />
        <span>{{ config().appName }}</span>
      </a>
      <button type="button" class="btn btn--ghost btn--icon" (click)="toggleTheme()"
        [attr.aria-label]="isDark() ? 'Switch to light theme' : 'Switch to dark theme'">
        <app-icon [name]="isDark() ? 'sun' : 'moon'" />
      </button>
    </header>
    <main id="main" tabindex="-1" class="main">
      <router-outlet />
    </main>
    <footer class="foot">
      <span>© {{ year }} {{ config().appName }} · {{ config().tagline }}</span>
    </footer>
  `,
  styles: `
    :host { display: grid; grid-template-rows: auto 1fr auto; min-height: 100dvh;
      background: radial-gradient(1200px 500px at 85% -10%, var(--c-primary-soft), transparent 60%), var(--c-bg); }
    .bar { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) clamp(1rem, 4vw, 3rem); }
    .brand { display: inline-flex; align-items: center; gap: var(--sp-3); color: var(--c-text); font-weight: 800; font-size: var(--fs-lg); text-decoration: none; }
    .main { display: grid; padding: var(--sp-4) clamp(1rem, 4vw, 3rem) var(--sp-10); outline: none; }
    .foot { padding: var(--sp-4); text-align: center; font-size: var(--fs-xs); color: var(--c-text-subtle); }
  `,
})
export class PublicLayout {
  private readonly prefs = inject(PreferencesService);
  protected readonly config = inject(AppConfigService).config;
  protected readonly year = new Date().getFullYear();
  protected readonly isDark = computed(() => {
    const t = this.prefs.prefs().theme;
    return t === 'dark' || (t === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  });

  protected toggleTheme(): void {
    this.prefs.set('theme', this.isDark() ? 'light' : 'dark');
  }
}
