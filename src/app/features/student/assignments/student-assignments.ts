import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Assignment, Submission } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { latestSubmission, workStatus } from '@features/common/academics/academic-status';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

type View = 'todo' | 'submitted' | 'evaluated';

/** Student → Assignments: View Assignment, Submit Work, View Feedback, Resubmit (if allowed). */
@Component({
  selector: 'app-student-assignments',
  imports: [RouterLink, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Assignments" subtitle="View your work, submit it before the due date and read teacher feedback." />
      <app-tabs [tabs]="tabs()" [active]="view()" (activeChange)="view.set($any($event))" label="Assignment status" />
      <app-load-state [loader]="data" emptyTitle="No assignments yet" />

      @if (data.value()) {
        <div class="grid-auto" role="tabpanel">
          @for (r of visible(); track r.a.id) {
            <a class="card card--interactive stack-sm item" [routerLink]="r.a.id">
              <div class="between">
                <span class="badge badge--accent">{{ lookup.subjectName(r.a.subjectId) }}</span>
                <app-status [value]="r.status" />
              </div>
              <h2 class="text-lg">{{ r.a.title }}</h2>
              <p class="text-sm muted clamp">{{ r.a.description }}</p>
              <p class="text-sm" [class.text-danger]="r.status === 'overdue'">
                <app-icon name="clock" [size]="14" style="display:inline-flex" /> Due {{ r.a.dueAt | date: 'MMM d, h:mm a' }} ({{ r.a.dueAt | relativeTime }})
              </p>
              @if (r.latest?.status === 'evaluated') {
                <p class="text-sm fw-700 text-success">{{ r.latest!.marks }} / {{ r.a.maxMarks }} marks</p>
              }
            </a>
          } @empty {
            <p class="muted">Nothing in this list.</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .item { color: var(--c-text); text-decoration: none; }
    .item:hover { color: var(--c-text); }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `,
})
export class StudentAssignments {
  private readonly api = inject(ApiService);
  protected readonly lookup = inject(LookupService);

  protected readonly data = loader(
    () => true,
    () => forkJoin({
      assignments: this.api.list<Assignment>('assignments', { _sort: 'dueAt' }),
      submissions: this.api.list<Submission>('submissions'),
    }),
  );

  private readonly rows = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.assignments.map((a) => {
      const latest = latestSubmission(a.id, d.submissions);
      return { a, latest, status: workStatus(a, latest) };
    });
  });

  protected readonly view = signal<View>('todo');
  protected readonly tabs = computed(() => {
    const r = this.rows();
    return [
      { key: 'todo', label: 'To do', count: r.filter((x) => x.status === 'pending' || x.status === 'overdue').length },
      { key: 'submitted', label: 'Submitted', count: r.filter((x) => x.status === 'submitted').length },
      { key: 'evaluated', label: 'Feedback', count: r.filter((x) => x.status === 'evaluated').length },
    ];
  });
  protected readonly visible = computed(() => {
    const v = this.view();
    return this.rows().filter((x) => (v === 'todo' ? x.status === 'pending' || x.status === 'overdue' : x.status === v));
  });
}
