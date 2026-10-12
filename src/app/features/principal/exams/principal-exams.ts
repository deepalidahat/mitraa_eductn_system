import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Exam, ExamAttempt } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatCard, StatusBadge, Tabs } from '@shared/ui';

/**
 * Principal / HOD → Examinations: Exam Readiness, Paper Approval (if role), Results Overview.
 * Releasing results is the approval step of the internal exam workflow.
 */
@Component({
  selector: 'app-principal-exams',
  imports: [DatePipe, PageHeader, LoadState, StatCard, StatusBadge, Tabs, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './principal-exams.html',
})
export class PrincipalExams {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly canApprovePaper = computed(() => this.auth.can('paper:approve'));
  protected readonly canRelease = computed(() => this.auth.can('results:release'));

  protected readonly data = loader(() => true, () => forkJoin({
    exams: this.api.list<Exam>('exams', { _sort: 'startAt' }),
    attempts: this.api.list<ExamAttempt>('examAttempts'),
  }));

  protected readonly tabs = computed(() => {
    const t = [{ key: 'readiness', label: 'Exam Readiness', count: null as number | null }];
    if (this.canApprovePaper()) t.push({ key: 'papers', label: 'Paper Approval', count: this.pendingPapers().length });
    t.push({ key: 'results', label: 'Results Overview', count: this.awaitingRelease().length });
    return t;
  });
  protected readonly tab = signal('readiness');

  private readonly exams = computed(() => this.data.value()?.exams ?? []);
  protected readonly upcoming = computed(() => this.exams().filter((e) => e.status !== 'completed' && Date.parse(e.endAt) > Date.now()));
  protected readonly pendingPapers = computed(() => this.exams().filter((e) => e.paperApproval === 'pending' && e.status !== 'draft'));
  protected readonly awaitingRelease = computed(() => this.exams().filter((e) => e.resultStatus === 'awaiting_approval'));
  protected readonly released = computed(() => this.exams().filter((e) => e.resultStatus === 'released'));

  protected readonly readinessStats = computed(() => {
    const up = this.upcoming();
    return [
      { label: 'Upcoming / open exams', value: String(up.length), tone: 'info' as const, icon: 'calendar' },
      { label: 'Papers approved', value: `${up.filter((e) => e.paperApproval === 'approved').length}/${up.length}`, tone: 'success' as const, icon: 'check-circle' },
      { label: 'Awaiting paper approval', value: String(this.pendingPapers().length), tone: 'warning' as const, icon: 'exam' },
      { label: 'Results to release', value: String(this.awaitingRelease().length), tone: 'accent' as const, icon: 'lock' },
    ];
  });

  protected readiness(e: Exam): string {
    if (e.paperApproval !== 'approved') return 'pending';
    if (e.status === 'published') return 'ready';
    return e.status;
  }

  /** Average / pass rate from evaluated attempts. */
  protected summary(e: Exam): { attempts: number; avg: number; pass: number } {
    const list = (this.data.value()?.attempts ?? []).filter((a) => a.examId === e.id && a.marks !== null);
    if (!list.length) return { attempts: 0, avg: 0, pass: 0 };
    const pcts = list.map((a) => ((a.marks ?? 0) / Math.max(1, e.totalMarks)) * 100);
    return { attempts: list.length, avg: Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length), pass: Math.round((pcts.filter((p) => p >= 35).length / pcts.length) * 100) };
  }

  protected readonly update = action((p: { id: string; body: Partial<Exam> }) => this.api.patch<Exam>(`exams/${p.id}`, p.body));

  protected decidePaper(e: Exam, decision: 'approved' | 'rejected'): void {
    this.run(e, { paperApproval: decision }, decision === 'approved' ? 'Paper approved. The teacher can now publish the exam.' : 'Paper sent back to the teacher.');
  }

  protected release(e: Exam): void {
    this.run(e, { resultStatus: 'released', status: 'completed' }, 'Results released to students and parents.');
  }

  private run(e: Exam, body: Partial<Exam>, msg: string): void {
    this.update.run({ id: e.id, body }, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, exams: d.exams.map((x) => (x.id === saved.id ? saved : x)) }));
        this.toast.success(msg);
      },
    });
  }
}
