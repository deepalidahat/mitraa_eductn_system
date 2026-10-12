import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Exam } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

/** Teacher → Examinations list. Create Exam happens via Question Bank → Build Paper. */
@Component({
  selector: 'app-teacher-exams',
  imports: [RouterLink, DatePipe, PageHeader, LoadState, StatusBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Examinations" subtitle="Create, schedule & publish exams, mark attempts, moderate and view analytics.">
        <a class="btn btn--role" routerLink="../question-bank"><app-icon name="plus" [size]="16" /> Create exam (build paper)</a>
      </app-page-header>
      <ol class="flow" aria-label="Internal exam workflow">
        @for (s of steps; track s; let i = $index) { <li><span>{{ i + 1 }}</span> {{ s }}</li> }
      </ol>
      <app-load-state [loader]="exams" emptyTitle="No exams yet" />
      @if (exams.value()?.length) {
        <div class="table-wrap">
          <table class="table">
            <caption class="sr-only">Exams</caption>
            <thead><tr><th scope="col">Exam</th><th scope="col">Class</th><th scope="col">Window</th><th scope="col">Paper</th><th scope="col">Status</th><th scope="col">Results</th><th scope="col"><span class="sr-only">Open</span></th></tr></thead>
            <tbody>
              @for (e of mine(); track e.id) {
                <tr>
                  <td><span class="fw-600">{{ e.title }}</span><br /><span class="text-xs muted">{{ lookup.subjectName(e.subjectId) }} · {{ e.totalMarks }} marks · {{ e.durationMin }} min</span></td>
                  <td>{{ lookup.className(e.classId) }}</td>
                  <td class="text-sm">{{ e.startAt | date: 'MMM d, h:mm a' }}<br />→ {{ e.endAt | date: 'MMM d, h:mm a' }}</td>
                  <td><app-status [value]="e.paperApproval" /></td>
                  <td><app-status [value]="e.status" /></td>
                  <td><app-status [value]="e.resultStatus" /></td>
                  <td class="text-right"><a class="btn btn--sm btn--role" [routerLink]="e.id">Manage</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .flow { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: 0; padding: 0; list-style: none; font-size: var(--fs-xs); font-weight: 600; color: var(--c-text-muted); }
    .flow li { display: inline-flex; align-items: center; gap: var(--sp-2); padding: var(--sp-1) var(--sp-3); border-radius: var(--radius-pill); background: var(--c-surface); border: 1px solid var(--c-border); }
    .flow span { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--c-role); color: #fff; }
  `,
})
export class TeacherExams {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly lookup = inject(LookupService);

  protected readonly steps = ['Create paper', 'Schedule & publish (after paper approval)', 'Students attempt', 'Evaluate & mark', 'Results approved & released'];
  protected readonly exams = loader(() => true, () => this.api.list<Exam>('exams', { _sort: 'startAt', _order: 'desc' }));
  protected readonly mine = computed(() => (this.exams.value() ?? []).filter((e) => e.createdBy === this.auth.user()?.id));
}
