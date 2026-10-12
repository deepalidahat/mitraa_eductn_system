import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { InterventionPlan, Performance } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

const SEVERITY_RANK = { high: 3, medium: 2, low: 1 } as const;

/** Teacher → Student Support: Identify Learning Gaps, Create Intervention Plan. */
@Component({
  selector: 'app-student-support',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-support.html',
})
export class StudentSupport {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly data = loader(() => true, () => forkJoin({
    performance: this.api.list<Performance>('performance'),
    plans: this.api.list<InterventionPlan>('interventionPlans'),
  }));

  /** Students with gaps first, highest severity first. */
  protected readonly students = computed(() =>
    (this.data.value()?.performance ?? [])
      .map((p) => ({ p, score: p.learningGaps.reduce((s, g) => s + SEVERITY_RANK[g.severity], 0) }))
      .sort((a, b) => b.score - a.score),
  );
  protected readonly selectedId = linkedSignal(() => this.students()[0]?.p.studentId ?? null);
  protected readonly selected = computed(() => this.students().find((s) => s.p.studentId === this.selectedId())?.p ?? null);
  protected readonly plans = computed(() => (this.data.value()?.plans ?? []).filter((p) => p.studentId === this.selectedId()));
  protected readonly creating = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    gap: ['', Validators.required],
    actions: ['', [Validators.required, Validators.minLength(5)]],
    startDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reviewDate: ['', Validators.required],
    sharedWithParent: [true],
  });

  protected readonly create = action((body: Partial<InterventionPlan>) => this.api.post<InterventionPlan>('interventionPlans', body));
  protected readonly complete = action((id: string) => this.api.patch<InterventionPlan>(`interventionPlans/${id}`, { status: 'completed' }));

  protected startPlan(gap?: string): void {
    this.form.reset({ gap: gap ?? '', actions: '', startDate: new Date().toISOString().slice(0, 10), reviewDate: '', sharedWithParent: true });
    this.creating.set(true);
  }

  protected submit(): void {
    const p = this.selected();
    if (!p || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const gap = p.learningGaps.find((g) => g.topic === v.gap);
    this.create.run(
      { studentId: p.studentId, studentName: this.lookup.studentName(p.studentId), subjectId: gap?.subjectId ?? '', gap: v.gap, actions: v.actions.split('\n').map((s) => s.trim()).filter(Boolean), startDate: v.startDate, reviewDate: v.reviewDate, sharedWithParent: v.sharedWithParent },
      {
        success: (plan) => {
          this.data.update((d) => ({ ...d, plans: [plan, ...d.plans] }));
          this.creating.set(false);
          this.toast.success('Intervention plan created.');
        },
      },
    );
  }

  protected markDone(plan: InterventionPlan): void {
    this.complete.run(plan.id, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, plans: d.plans.map((x) => (x.id === saved.id ? saved : x)) }));
        this.toast.success('Plan marked complete.');
      },
    });
  }
}
