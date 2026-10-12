import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AppNotification, roleMeta } from '@core/models';
import { AppConfigService } from '@core/services/app-config.service';
import { ALL_CAMPUSES, ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { NotificationService } from '@core/services/notification.service';
import { Preferences, PreferencesService } from '@core/services/preferences.service';
import { InitialsPipe } from '@shared/pipes/initials-pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon } from '@shared/ui';

type Menu = 'notifications' | 'a11y' | 'user';

@Component({
  selector: 'app-topbar',
  imports: [FormsModule, RouterLink, Icon, InitialsPipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'openMenu.set(null)',
  },
})
export class Topbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(LookupService);
  protected readonly ctx = inject(ContextService);
  protected readonly notifications = inject(NotificationService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly config = inject(AppConfigService).config;

  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();

  protected readonly ALL = ALL_CAMPUSES;
  protected readonly openMenu = signal<Menu | null>(null);
  protected readonly query = signal('');
  protected readonly user = this.auth.user;
  protected readonly roleLabel = computed(() => {
    const r = this.auth.role();
    return r ? roleMeta(r).label : '';
  });

  protected readonly profileLink = computed(() => `${this.auth.homeUrl()}/profile`);

  /** Read-only scope chip for roles without a switcher. */
  protected readonly scopeLabel = computed(() => {
    const u = this.user();
    if (!u) return '';
    if (u.role === 'student') return this.lookup.className(u.classId);
    if (u.role === 'teacher') return (u.classIds ?? []).map((c) => this.lookup.className(c)).join(', ');
    return (u.campusIds ?? []).map((c) => this.lookup.campusName(c)).join(', ');
  });

  protected toggle(menu: Menu): void {
    this.openMenu.update((m) => (m === menu ? null : menu));
  }

  protected onDocumentClick(e: MouseEvent): void {
    if (this.openMenu() && !this.host.nativeElement.contains(e.target as Node)) this.openMenu.set(null);
  }

  protected search(): void {
    const q = this.query().trim();
    if (!q) return;
    void this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected openNotification(n: AppNotification): void {
    if (!n.read) this.notifications.markRead(n.id);
    this.openMenu.set(null);
    void this.router.navigateByUrl(n.link);
  }

  protected setPref<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.prefs.set(key, value);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
