import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Exam, ExamAttempt, Question } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { BarChart, LoadState, PageHeader, StatCard, StatusBadge, Tabs } from '@shared/ui';

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/**
 * One exam: Schedule & Publish → Evaluate / Mark → Moderation (if applicable) → View Analytics
 * → send results for approval (released by an authorized role).
 */
@Component({
  selector: 'app-exam-manage',
  imports: [FormsModule, DatePipe, PageHeader, LoadState, StatCard, StatusBadge, Tabs, BarChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-manage.html',
})
export class ExamManage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  readonly id = input.required<string>();

  protected readonly data = loader(
    () => this.id(),
    (id) =>
      forkJoin({ exam: this.api.get<Exam>(`exams/${id}`), attempts: this.api.list<ExamAttempt>('examAttempts', { examId: id }) }).pipe(
        switchMap((d) =>
          (d.exam.questionIds.length ? this.api.list<Question>('questions', { id: d.exam.questionIds }) : of([] as Question[])).pipe(map((questions) => ({ ...d, questions }))),
        ),
      ),
  );
  protected readonly exam = computed(() => this.data.value()?.exam);
  protected readonly attempts = computed(() => this.data.value()?.attempts ?? []);
  protected readonly canModerate = computed(() => !!this.exam()?.moderationRequired && this.auth.can('exam:moderate'));

  protected readonly tabs = computed(() => [
    { key: 'schedule', label: 'Schedule & Publish' },
    { key: 'marking', label: 'Evaluate / Mark', count: this.attempts().filter((a) => a.status === 'submitted').length },
    ...(this.canModerate() ? [{ key: 'moderation', label: 'Moderation' }] : []),
    { key: 'analytics', label: 'Analytics' },
  ]);
  protected readonly tab = signal('schedule');

  // ---- schedule
  protected readonly startAt = linkedSignal(() => (this.exam() ? toLocalInput(this.exam()!.startAt) : ''));
  protected readonly endAt = linkedSignal(() => (this.exam() ? toLocalInput(this.exam()!.endAt) : ''));
  protected readonly update = action((body: Partial<Exam>) => this.api.patch<Exam>(`exams/${this.id()}`, body));

  protected saveSchedule(status?: Exam['status']): void {
    const start = Date.parse(this.startAt());
    const end = Date.parse(this.endAt());
    if (!(end > start)) {
      this.toast.show('The window must end after it starts.', 'warning');
      return;
    }
    this.patch({ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), ...(status ? { status } : {}) },
      status === 'published' ? 'Exam published to students.' : status === 'scheduled' ? 'Scheduled. Waiting for paper approval.' : 'Schedule saved.');
  }

  // ---- marking
  protected readonly selectedAttemptId = linkedSignal(() => this.attempts().find((a) => a.status === 'submitted')?.id ?? this.attempts()[0]?.id ?? null);
  protected readonly selectedAttempt = computed(() => this.attempts().find((a) => a.id === this.selectedAttemptId()) ?? null);
  protected readonly marks = signal(0);
  protected readonly remarks = signal('');
  protected readonly mark = action((p: { id: string; marks: number; remarks: string }) =>
    this.api.patch<ExamAttempt>(`examAttempts/${p.id}`, { marks: p.marks, remarks: p.remarks, status: 'evaluated' }),
  );

  constructor() {
    effect(() => {
      const a = this.selectedAttempt();
      this.marks.set(a?.marks ?? a?.autoMarks ?? 0);
      this.remarks.set(a?.remarks ?? '');
    });
  }

  protected saveMarks(): void {
    const a = this.selectedAttempt();
    const total = this.exam()?.totalMarks ?? 0;
    if (!a) return;
    if (this.marks() < 0 || this.marks() > total) {
      this.toast.show(`Marks must be between 0 and ${total}.`, 'warning');
      return;
    }
    this.mark.run({ id: a.id, marks: this.marks(), remarks: this.remarks() }, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, attempts: d.attempts.map((x) => (x.id === saved.id ? saved : x)) }));
        this.toast.success(`Marks saved for ${this.lookup.studentName(saved.studentId)}.`);
      },
    });
  }

  protected answerText(q: Question, index: number | null | undefined): string {
    return index === null || index === undefined ? 'Not answered' : `${'ABCD'[index]}. ${q.options[index]}`;
  }

  // ---- results
  protected readonly allMarked = computed(() => this.attempts().length > 0 && this.attempts().every((a) => a.status === 'evaluated'));
  protected readonly readyForApproval = computed(() => this.allMarked() && (!this.exam()?.moderationRequired || !!this.exam()?.moderated));

  protected sendForApproval(): void {
    this.patch({ resultStatus: 'awaiting_approval' }, 'Results sent for approval.');
  }

  protected completeModeration(): void {
    this.patch({ moderated: true }, 'Moderation recorded.');
  }

  // ---- analytics
  protected readonly analytics = computed(() => {
    const d = this.data.value();
    const marked = (d?.attempts ?? []).filter((a) => a.marks !== null);
    const total = d?.exam.totalMarks || 1;
    const pcts = marked.map((a) => Math.round(((a.marks ?? 0) / total) * 100));
    const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : 0;
    const bands = [
      { label: '0–39%', value: pcts.filter((p) => p < 40).length },
      { label: '40–59%', value: pcts.filter((p) => p >= 40 && p < 60).length },
      { label: '60–79%', value: pcts.filter((p) => p >= 60 && p < 80).length },
      { label: '80–100%', value: pcts.filter((p) => p >= 80).length },
    ];
    const perQuestion = (d?.questions ?? []).map((q) => {
      const idx = d!.exam.questionIds.indexOf(q.id);
      const correct = (d?.attempts ?? []).filter((a) => a.answers[idx] === q.answerIndex).length;
      return { label: q.text.length > 38 ? q.text.slice(0, 38) + '…' : q.text, value: d!.attempts.length ? Math.round((correct / d!.attempts.length) * 100) : 0 };
    });
    return {
      stats: [
        { label: 'Attempts', value: String(d?.attempts.length ?? 0), tone: 'info' as const, icon: 'users' },
        { label: 'Average', value: `${avg}%`, tone: 'accent' as const, icon: 'chart' },
        { label: 'Highest', value: pcts.length ? `${Math.max(...pcts)}%` : '—', tone: 'success' as const, icon: 'trend' },
        { label: 'Lowest', value: pcts.length ? `${Math.min(...pcts)}%` : '—', tone: 'warning' as const, icon: 'alert' },
      ],
      bands,
      perQuestion,
    };
  });

  private patch(body: Partial<Exam>, msg: string): void {
    this.update.run(body, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, exam: saved }));
        this.toast.success(msg);
      },
    });
  }
}
