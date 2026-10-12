import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Assignment, Submission } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

type PublishMode = 'now' | 'schedule' | 'draft';

/** Teacher → Assignment Engine: Create, Schedule / Publish, View Submissions, Evaluate, Track Completion. */
@Component({
  selector: 'app-teacher-assignments',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, PageHeader, LoadState, StatusBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-assignments.html',
})
export class TeacherAssignments {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly classes = computed(() => this.lookup.classes().filter((c) => this.auth.user()?.classIds?.includes(c.id)));
  protected readonly subjects = computed(() => this.lookup.subjects().filter((s) => this.auth.user()?.subjectIds?.includes(s.id)));

  protected readonly data = loader(
    () => this.auth.user()?.id,
    (teacherId) => forkJoin({
      assignments: this.api.list<Assignment>('assignments', { teacherId, _sort: 'dueAt', _order: 'desc' }),
      submissions: this.api.list<Submission>('submissions'),
    }),
  );

  protected readonly rows = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.assignments.map((a) => {
      const subs = d.submissions.filter((s) => s.assignmentId === a.id);
      const students = new Set(subs.map((s) => s.studentId)).size;
      const total = this.lookup.studentsInClass(a.classId).length;
      const toEvaluate = subs.filter((s) => s.status === 'submitted').length;
      return { a, students, total, toEvaluate, pct: total ? Math.round((students / total) * 100) : 0 };
    });
  });

  protected readonly creating = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    classId: ['', Validators.required],
    subjectId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    dueAt: ['', Validators.required],
    maxMarks: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    allowResubmit: [false],
    publishMode: ['now' as PublishMode],
    publishAt: [''],
  });

  protected readonly create = action((body: object) => this.api.post<Assignment>('assignments', body));
  protected readonly publish = action((id: string) => this.api.patch<Assignment>(`assignments/${id}`, { status: 'published', publishAt: new Date().toISOString() }));

  protected submit(): void {
    const v = this.form.getRawValue();
    if (v.publishMode === 'schedule' && !v.publishAt) this.form.controls.publishAt.setErrors({ required: true });
    if (this.form.invalid || (v.publishMode === 'schedule' && !v.publishAt)) {
      this.form.markAllAsTouched();
      return;
    }
    if (Date.parse(v.dueAt) <= Date.now()) {
      this.toast.show('The due date must be in the future.', 'warning');
      return;
    }
    const status = v.publishMode === 'now' ? 'published' : v.publishMode === 'schedule' ? 'scheduled' : 'draft';
    const body = {
      classId: v.classId, subjectId: v.subjectId, title: v.title, description: v.description, maxMarks: v.maxMarks,
      allowResubmit: v.allowResubmit, dueAt: new Date(v.dueAt).toISOString(), status,
      publishAt: status === 'scheduled' ? new Date(v.publishAt).toISOString() : status === 'published' ? new Date().toISOString() : null,
    };
    this.create.run(body, {
      success: (a) => {
        this.data.update((d) => ({ ...d, assignments: [a, ...d.assignments] }));
        this.creating.set(false);
        this.form.reset();
        this.toast.success(status === 'published' ? 'Assignment published to students.' : status === 'scheduled' ? 'Assignment scheduled.' : 'Draft saved.');
      },
    });
  }

  protected publishNow(a: Assignment): void {
    this.publish.run(a.id, {
      success: (saved) => {
        this.data.update((d) => ({ ...d, assignments: d.assignments.map((x) => (x.id === saved.id ? saved : x)) }));
        this.toast.success('Assignment published.');
      },
    });
  }
}
