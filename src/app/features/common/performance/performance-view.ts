import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { InterventionPlan, Performance } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { BarChart, Icon, LoadState, PageHeader, StatCard, StatusBadge } from '@shared/ui';

/**
 * Student → My Performance (Progress & Analytics, Learning Gaps)
 * Parent → Progress & Reports (Academic Progress, Teacher Remarks, Learning Gaps / Support Plan)
 * Charts always come with a text alternative.
 */
@Component({
  selector: 'app-performance-view',
  imports: [RouterLink, DatePipe, PageHeader, LoadState, StatCard, StatusBadge, BarChart, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './performance-view.html',
})
export class PerformanceView {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  protected readonly lookup = inject(LookupService);

  protected readonly isParent = computed(() => this.auth.role() === 'parent');
  private readonly studentId = computed(() => (this.isParent() ? this.ctx.activeChildId() : this.auth.user()?.studentId ?? null));

  protected readonly data = loader(this.studentId, (id) =>
    forkJoin({
      perf: this.api.get<Performance>(`performance/${id}`),
      plans: this.isParent() ? this.api.list<InterventionPlan>('interventionPlans', { studentId: id }).pipe(catchError(() => of([]))) : of([] as InterventionPlan[]),
    }),
  );

  protected readonly perf = computed(() => this.data.value()?.perf);
  protected readonly stats = computed(() => {
    const p = this.perf();
    if (!p) return [];
    return [
      { label: 'Overall', value: `${p.overall}%`, tone: 'info' as const, icon: 'trend' },
      { label: 'Class rank', value: `#${p.rank}`, tone: 'accent' as const, icon: 'graduation' },
      { label: 'Attendance', value: `${p.attendancePct}%`, tone: (p.attendancePct >= 90 ? 'success' : 'warning') as 'success' | 'warning', icon: 'check-square' },
      { label: 'Learning gaps', value: String(p.learningGaps.length), tone: (p.learningGaps.length ? 'warning' : 'success') as 'success' | 'warning', icon: 'target' },
    ];
  });
  protected readonly bars = computed(() => (this.perf()?.subjects ?? []).map((s) => ({ label: s.name, value: s.score })));
  protected readonly heading = computed(() => (this.isParent() ? 'Progress & Reports' : 'My Performance'));
  protected readonly childName = computed(() => this.ctx.activeChild()?.name);
}
