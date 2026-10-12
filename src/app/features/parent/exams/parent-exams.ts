import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Exam, ExamAttempt } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { examWindow, resultsReleased } from '@features/common/academics/academic-status';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

/** Parent → Examinations: View Exam Schedule, View Results (after release). */
@Component({
  selector: 'app-parent-exams',
  imports: [DatePipe, PageHeader, LoadState, StatusBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Examinations" [subtitle]="'Exam schedule and released results for ' + (ctx.activeChild()?.name ?? 'your child') + '.'" />
      <app-load-state [loader]="data" emptyTitle="No exams scheduled" [empty]="data.value() ? !rows().length : null" />
      @if (rows().length) {
        <div class="table-wrap">
          <table class="table">
            <caption class="sr-only">Exam schedule and results</caption>
            <thead><tr><th scope="col">Exam</th><th scope="col">Subject</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Result</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.e.id) {
                <tr>
                  <td class="fw-600">{{ r.e.title }}</td>
                  <td>{{ lookup.subjectName(r.e.subjectId) }}</td>
                  <td>{{ r.e.startAt | date: 'MMM d, h:mm a' }}</td>
                  <td><app-status [value]="r.window" /></td>
                  <td>
                    @if (r.released && r.attempt?.marks !== null && r.attempt?.marks !== undefined) {
                      <span class="fw-700">{{ r.attempt!.marks }} / {{ r.e.totalMarks }}</span>
                      @if (r.attempt!.remarks) { <br /><span class="text-xs muted">{{ r.attempt!.remarks }}</span> }
                    } @else if (r.released) {
                      <span class="muted text-sm">Not attempted</span>
                    } @else {
                      <span class="muted text-sm"><app-icon name="lock" [size]="12" style="display:inline-flex" /> Not released yet</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-xs muted">Results appear only after the school approves and releases them.</p>
      }
    </div>
  `,
})
export class ParentExams {
  private readonly api = inject(ApiService);
  protected readonly ctx = inject(ContextService);
  protected readonly lookup = inject(LookupService);

  protected readonly data = loader(
    () => this.ctx.activeChild(),
    (child) => forkJoin({
      exams: this.api.list<Exam>('exams', { classId: child.classId, _sort: 'startAt', _order: 'desc' }),
      attempts: this.api.list<ExamAttempt>('examAttempts', { studentId: child.id }),
    }),
  );

  protected readonly rows = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.exams.map((e) => {
      const attempt = d.attempts.find((a) => a.examId === e.id);
      return { e, attempt, window: examWindow(e, attempt), released: resultsReleased(e) };
    });
  });
}
