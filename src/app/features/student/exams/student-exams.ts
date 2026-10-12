import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Exam, ExamAttempt } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { examWindow, resultsReleased } from '@features/common/academics/academic-status';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

/** Student → Examinations: View Exam Schedule, Attempt Exam (as per time), View Results (after release). */
@Component({
  selector: 'app-student-exams',
  imports: [RouterLink, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Examinations" subtitle="Your exam schedule, attempts and released results." />
      <app-tabs [tabs]="tabs" [active]="view()" (activeChange)="view.set($event)" label="Examinations" />
      <app-load-state [loader]="data" emptyTitle="No exams scheduled" />

      @if (data.value()) {
        @if (view() === 'schedule') {
          <div class="table-wrap" role="tabpanel">
            <table class="table">
              <caption class="sr-only">Exam schedule</caption>
              <thead><tr><th scope="col">Exam</th><th scope="col">Subject</th><th scope="col">Window</th><th scope="col">Duration</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead>
              <tbody>
                @for (r of rows(); track r.e.id) {
                  <tr>
                    <td class="fw-600">{{ r.e.title }}</td>
                    <td>{{ lookup.subjectName(r.e.subjectId) }}</td>
                    <td>{{ r.e.startAt | date: 'MMM d, h:mm a' }} – {{ r.e.endAt | date: 'MMM d, h:mm a' }}</td>
                    <td>{{ r.e.durationMin }} min</td>
                    <td><app-status [value]="r.window" /></td>
                    <td class="text-right">
                      @if (r.window === 'open') {
                        <a class="btn btn--role btn--sm" [routerLink]="[r.e.id, 'attempt']">Attempt now</a>
                      } @else if (r.window === 'upcoming') {
                        <span class="text-xs muted">Opens {{ r.e.startAt | relativeTime }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="grid-auto" role="tabpanel">
            @for (r of results(); track r.e.id) {
              <article class="card stack-sm">
                <div class="between"><span class="badge badge--accent">{{ lookup.subjectName(r.e.subjectId) }}</span><app-status [value]="r.released ? 'released' : 'pending'" /></div>
                <h2 class="text-lg">{{ r.e.title }}</h2>
                @if (r.released && r.attempt?.marks !== null && r.attempt?.marks !== undefined) {
                  <p class="score"><strong>{{ r.attempt!.marks }}</strong> / {{ r.e.totalMarks }}</p>
                  <div class="progress" aria-hidden="true"><span [style.width.%]="(r.attempt!.marks! / r.e.totalMarks) * 100"></span></div>
                  @if (r.attempt!.remarks) { <p class="text-sm muted">“{{ r.attempt!.remarks }}”</p> }
                } @else if (r.released) {
                  <p class="text-sm muted">Results released. You did not attempt this exam.</p>
                } @else {
                  <p class="text-sm muted"><app-icon name="lock" [size]="14" style="display:inline-flex" /> Results will appear here once they are approved and released.</p>
                }
              </article>
            } @empty {
              <p class="muted">No results yet.</p>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `.score { font-size: var(--fs-2xl); } .score strong { color: var(--c-role); }`,
})
export class StudentExams {
  private readonly api = inject(ApiService);
  protected readonly lookup = inject(LookupService);

  protected readonly tabs = [{ key: 'schedule', label: 'Schedule' }, { key: 'results', label: 'Results' }];
  protected readonly view = signal('schedule');

  protected readonly data = loader(
    () => true,
    () => forkJoin({
      exams: this.api.list<Exam>('exams', { _sort: 'startAt' }),
      attempts: this.api.list<ExamAttempt>('examAttempts'),
    }),
  );

  protected readonly rows = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.exams.map((e) => {
      const attempt = d.attempts.find((x) => x.examId === e.id);
      return { e, attempt, window: examWindow(e, attempt), released: resultsReleased(e) };
    });
  });

  protected readonly results = computed(() => this.rows().filter((r) => r.attempt || r.released));
}
