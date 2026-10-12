import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Assignment, Submission } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { canResubmit, latestSubmission, workStatus } from '@features/common/academics/academic-status';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

/** Assignment detail: brief, submit work, feedback, resubmit area (only when permitted). */
@Component({
  selector: 'app-assignment-detail',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-detail.html',
})
export class AssignmentDetail {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  /** Route param. */
  readonly id = input.required<string>();

  protected readonly data = loader(
    () => this.id(),
    (id) => forkJoin({
      assignment: this.api.get<Assignment>(`assignments/${id}`),
      submissions: this.api.list<Submission>('submissions', { assignmentId: id, _sort: 'attempt', _order: 'desc' }),
    }),
  );

  protected readonly a = computed(() => this.data.value()?.assignment);
  protected readonly history = computed(() => this.data.value()?.submissions ?? []);
  protected readonly latest = computed(() => (this.a() ? latestSubmission(this.a()!.id, this.history()) : undefined));
  protected readonly status = computed(() => (this.a() ? workStatus(this.a()!, this.latest()) : 'pending'));
  protected readonly canSubmit = computed(() => !this.latest());
  protected readonly canResubmit = computed(() => !!this.a() && canResubmit(this.a()!, this.latest()));
  protected readonly showForm = signal(false);
  protected readonly fileName = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    content: ['', [Validators.required, Validators.minLength(5)]],
  });

  protected readonly submit = action((body: object) => this.api.post<Submission>('submissions', body));

  protected onFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file && file.size > 10 * 1024 * 1024) {
      this.toast.show('Files must be 10 MB or smaller.', 'warning');
      (e.target as HTMLInputElement).value = '';
      return;
    }
    // Upload storage is a backend decision; the mock records the file name only.
    this.fileName.set(file?.name ?? null);
  }

  protected send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submit.run({ assignmentId: this.id(), content: this.form.getRawValue().content, attachmentName: this.fileName() }, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, submissions: [saved, ...d.submissions] }));
        this.form.reset();
        this.fileName.set(null);
        this.showForm.set(false);
        this.toast.success(saved.attempt > 1 ? 'Resubmitted successfully.' : 'Work submitted successfully.');
      },
    });
  }
}
