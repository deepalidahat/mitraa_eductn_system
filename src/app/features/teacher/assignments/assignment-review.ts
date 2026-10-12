import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Assignment, Submission } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { latestSubmission } from '@features/common/academics/academic-status';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, PageHeader, StatCard, StatusBadge } from '@shared/ui';

/** View Submissions → Evaluate & Give Feedback → Track Completion, for one assignment. */
@Component({
  selector: 'app-assignment-review',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatCard, StatusBadge, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-review.html',
})
export class AssignmentReview {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  readonly id = input.required<string>();

  protected readonly data = loader(
    () => this.id(),
    (id) => forkJoin({
      assignment: this.api.get<Assignment>(`assignments/${id}`),
      submissions: this.api.list<Submission>('submissions', { assignmentId: id }),
    }),
  );
  protected readonly a = computed(() => this.data.value()?.assignment);

  /** One row per student in the class: latest submission (if any). */
  protected readonly roster = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return this.lookup.studentsInClass(d.assignment.classId).map((st) => ({
      st,
      sub: latestSubmission(d.assignment.id, d.submissions.filter((s) => s.studentId === st.id)),
    }));
  });
  protected readonly stats = computed(() => {
    const r = this.roster();
    const submitted = r.filter((x) => x.sub).length;
    const evaluated = r.filter((x) => x.sub?.status === 'evaluated').length;
    return [
      { label: 'Submitted', value: `${submitted}/${r.length}`, tone: 'info' as const, icon: 'upload' },
      { label: 'Evaluated', value: String(evaluated), tone: 'success' as const, icon: 'check-circle' },
      { label: 'Awaiting evaluation', value: String(submitted - evaluated), tone: 'warning' as const, icon: 'clipboard' },
      { label: 'Not submitted', value: String(r.length - submitted), tone: 'danger' as const, icon: 'alert' },
    ];
  });

  protected readonly selectedId = linkedSignal(() => this.roster().find((r) => r.sub?.status === 'submitted')?.sub?.id ?? this.roster().find((r) => r.sub)?.sub?.id ?? null);
  protected readonly selected = computed(() => this.data.value()?.submissions.find((s) => s.id === this.selectedId()) ?? null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    marks: [0, [Validators.required, Validators.min(0)]],
    feedback: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected readonly evaluate = action((p: { id: string; marks: number; feedback: string }) =>
    this.api.patch<Submission>(`submissions/${p.id}`, { marks: p.marks, feedback: p.feedback, status: 'evaluated' }),
  );

  constructor() {
    effect(() => {
      const s = this.selected();
      const max = this.a()?.maxMarks ?? 100;
      this.form.controls.marks.setValidators([Validators.required, Validators.min(0), Validators.max(max)]);
      this.form.reset({ marks: s?.marks ?? 0, feedback: s?.feedback ?? '' });
    });
  }

  protected save(): void {
    const s = this.selected();
    if (!s || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.evaluate.run({ id: s.id, ...this.form.getRawValue() }, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, submissions: d.submissions.map((x) => (x.id === saved.id ? saved : x)) }));
        this.toast.success(`Feedback saved for ${this.lookup.studentName(saved.studentId)}.`);
        const next = this.roster().find((r) => r.sub?.status === 'submitted');
        if (next?.sub) this.selectedId.set(next.sub.id);
      },
    });
  }
}
