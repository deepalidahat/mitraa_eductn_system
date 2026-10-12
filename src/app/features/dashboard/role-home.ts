import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Dashboard, Notice, roleMeta } from '@core/models';
import { NAVIGATION } from '@core/navigation/navigation';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, StatCard } from '@shared/ui';

/**
 * Shared dashboard home for every role: welcome banner with active scope, summary cards,
 * items needing attention, shortcuts to permitted modules and latest notices.
 * (Exact metrics per role are still to be confirmed; cards come from the API.)
 */
@Component({
  selector: 'app-role-home',
  imports: [RouterLink, DatePipe, Icon, LoadState, StatCard, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-home.html',
  styleUrl: './role-home.scss',
})
export class RoleHome {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  private readonly lookup = inject(LookupService);

  protected readonly today = new Date();
  protected readonly user = this.auth.user;
  protected readonly meta = computed(() => roleMeta(this.auth.role()!));
  protected readonly base = computed(() => `/${this.meta().path}`);
  protected readonly firstName = computed(() => (this.user()?.name ?? '').replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '').split(' ')[0]);
  protected readonly child = this.ctx.activeChild;

  protected readonly scope = computed(() => {
    const u = this.user();
    if (!u) return '';
    switch (u.role) {
      case 'student': return this.lookup.className(u.classId);
      case 'parent': return this.child() ? `${this.child()!.name} · ${this.lookup.className(this.child()!.classId)}` : '';
      case 'teacher': return (u.classIds ?? []).map((c) => this.lookup.className(c)).join(', ');
      default: return this.ctx.campusScope().map((c) => this.lookup.campusName(c)).join(', ');
    }
  });

  /** Parents see the dashboard of the selected child; it reloads when they switch child. */
  private readonly dashboardId = computed(() => {
    const role = this.auth.role();
    if (role === 'parent') {
      const childId = this.ctx.activeChildId();
      return childId ? `parent-${childId}` : null;
    }
    return role;
  });

  protected readonly dashboard = loader(this.dashboardId, (id) => this.api.get<Dashboard>(`dashboards/${id}`));
  protected readonly notices = loader(
    () => this.auth.role(),
    () => this.api.list<Notice>('notices', { status: 'published', _sort: 'publishedAt', _order: 'desc', _limit: 3 }),
  );

  protected readonly shortcuts = computed(() =>
    NAVIGATION[this.auth.role()!].filter((n) => n.path && n.path !== 'profile').slice(0, 8),
  );
}
