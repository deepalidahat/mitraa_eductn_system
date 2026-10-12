import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { roleMeta } from '@core/models';
import { NAVIGATION } from '@core/navigation/navigation';
import { Icon } from '@shared/ui';
import { Topbar } from './topbar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: { '(document:keydown.escape)': 'navOpen.set(false)' },
})
export class Shell {
  private readonly auth = inject(AuthService);

  protected readonly navOpen = signal(false);
  protected readonly meta = computed(() => {
    const role = this.auth.role();
    return role ? roleMeta(role) : null;
  });
  protected readonly base = computed(() => '/' + (this.meta()?.path ?? ''));
  protected readonly items = computed(() => {
    const role = this.auth.role();
    return role ? NAVIGATION[role] : [];
  });

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.navOpen.set(false));
  }

  protected link(path: string): string {
    return path ? `${this.base()}/${path}` : this.base();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
