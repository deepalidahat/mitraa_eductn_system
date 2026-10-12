import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { PracticeSession } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { BarChart, LoadState, PageHeader } from '@shared/ui';

/** Parent → PracticePod: View Practice Activity (only what the child chose to share). */
@Component({
  selector: 'app-parent-practice',
  imports: [DatePipe, PageHeader, LoadState, BarChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="PracticePod" [subtitle]="'Practice activity ' + (ctx.activeChild()?.name ?? 'your child') + ' has shared with you.'" />
      <p class="alert" role="note">Only practice sessions your child chooses to share are visible here.</p>
      <app-load-state [loader]="sessions" emptyTitle="No shared practice yet" emptyText="When your child shares a practice session, it will appear here." />
      @if (sessions.value()?.length) {
        <div class="split">
          <div class="table-wrap">
            <table class="table">
              <caption class="sr-only">Shared practice sessions</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Subject</th><th scope="col">Chapter</th><th scope="col">Score</th><th scope="col">Mode</th></tr></thead>
              <tbody>
                @for (s of sessions.value(); track s.id) {
                  <tr>
                    <td>{{ s.completedAt | date: 'MMM d, y' }}</td>
                    <td>{{ lookup.subjectName(s.subjectId) }}</td>
                    <td>{{ s.chapter }}</td>
                    <td class="fw-700">{{ s.score }}/{{ s.total }}</td>
                    <td><span class="badge">{{ s.mode }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <section class="card stack">
            <h2 class="card__title">Score by session</h2>
            <app-bar-chart [data]="bars()" unit="%" title="Practice score by session" />
          </section>
        </div>
      }
    </div>
  `,
})
export class ParentPractice {
  private readonly api = inject(ApiService);
  protected readonly ctx = inject(ContextService);
  protected readonly lookup = inject(LookupService);

  protected readonly sessions = loader(
    () => this.ctx.activeChildId(),
    (studentId) => this.api.list<PracticeSession>('practiceSessions', { studentId, _sort: 'completedAt', _order: 'desc' }),
  );
  protected readonly bars = computed(() =>
    (this.sessions.value() ?? []).map((s) => ({ label: `${s.chapter} (${new Date(s.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`, value: Math.round((s.score / Math.max(1, s.total)) * 100) })),
  );
}
