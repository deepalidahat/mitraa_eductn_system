import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Assignment, Submission } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { latestSubmission, workStatus } from '@features/common/academics/academic-status';
import { LoadState, PageHeader, StatusBadge } from '@shared/ui';

/** Parent → Assignments: View Assigned Work, Check Submission Status, View Feedback. */
@Component({
  selector: 'app-parent-assignments',
  imports: [DatePipe, PageHeader, LoadState, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Assignments" [subtitle]="'Work assigned to ' + (ctx.activeChild()?.name ?? 'your child') + ', submission status and teacher feedback.'" />
      <app-load-state [loader]="data" emptyTitle="No assignments yet" [empty]="data.value() ? !rows().length : null" />
      @if (rows().length) {
        <div class="split-list">
          <section class="card" aria-label="Assignments">
            <ul class="list">
              @for (r of rows(); track r.a.id) {
                <li>
                  <button type="button" class="list-row list-row--link" (click)="selectedId.set(r.a.id)" [attr.aria-current]="selectedId() === r.a.id">
                    <span class="list-row__body">
                      <span class="list-row__title">{{ r.a.title }}</span>
                      <span class="list-row__meta">{{ lookup.subjectName(r.a.subjectId) }} · due {{ r.a.dueAt | date: 'MMM d' }}</span>
                    </span>
                    <app-status [value]="r.status" />
                  </button>
                </li>
              }
            </ul>
          </section>
          <section class="card stack" aria-live="polite">
            @if (selected(); as r) {
              <div class="between"><h2 class="card__title">{{ r.a.title }}</h2><app-status [value]="r.status" /></div>
              <p class="pre-wrap text-sm">{{ r.a.description }}</p>
              <dl class="kv">
                <dt>Subject</dt><dd>{{ lookup.subjectName(r.a.subjectId) }}</dd>
                <dt>Due</dt><dd>{{ r.a.dueAt | date: 'medium' }}</dd>
                <dt>Submitted</dt><dd>{{ r.latest ? (r.latest.submittedAt | date: 'medium') + ' (attempt ' + r.latest.attempt + ')' : 'Not yet' }}</dd>
              </dl>
              @if (r.latest?.status === 'evaluated') {
                <div class="alert alert--success"><div><p class="fw-700">{{ r.latest!.marks }} / {{ r.a.maxMarks }}</p><p>{{ r.latest!.feedback }}</p></div></div>
              } @else if (r.latest) {
                <p class="alert">Submitted — waiting for the teacher's feedback.</p>
              } @else if (r.status === 'overdue') {
                <p class="alert alert--danger">Not submitted and past the due date.</p>
              }
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class ParentAssignments {
  private readonly api = inject(ApiService);
  protected readonly ctx = inject(ContextService);
  protected readonly lookup = inject(LookupService);

  protected readonly data = loader(
    () => this.ctx.activeChild(),
    (child) => forkJoin({
      assignments: this.api.list<Assignment>('assignments', { classId: child.classId, _sort: 'dueAt', _order: 'desc' }),
      submissions: this.api.list<Submission>('submissions', { studentId: child.id }),
    }),
  );

  protected readonly rows = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.assignments.map((a) => {
      const latest = latestSubmission(a.id, d.submissions);
      return { a, latest, status: workStatus(a, latest) };
    });
  });
  protected readonly selectedId = linkedSignal(() => this.rows()[0]?.a.id ?? null);
  protected readonly selected = computed(() => this.rows().find((r) => r.a.id === this.selectedId()) ?? null);
}
