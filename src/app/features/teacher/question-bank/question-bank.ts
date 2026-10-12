import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Difficulty, Exam, Question, QuestionStatus } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

/** Teacher → Question Bank: Create / Manage, Tag Syllabus & Marks, Review & Approval, Build Papers. */
@Component({
  selector: 'app-question-bank',
  imports: [ReactiveFormsModule, FormsModule, PageHeader, LoadState, StatusBadge, Tabs, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss',
})
export class QuestionBank {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly lookup = inject(LookupService);

  protected readonly tabs = [{ key: 'bank', label: 'Questions' }, { key: 'review', label: 'Review & Approval' }, { key: 'builder', label: 'Build Paper' }];
  protected readonly tab = signal('bank');

  protected readonly questions = loader(() => true, () => this.api.list<Question>('questions', { _sort: 'chapter' }));
  protected readonly subjects = computed(() => this.lookup.subjects().filter((s) => this.auth.user()?.subjectIds?.includes(s.id)));
  protected readonly classes = computed(() => this.lookup.classes().filter((c) => this.auth.user()?.classIds?.includes(c.id)));

  // ---- filters
  protected readonly fSubject = signal('');
  protected readonly fStatus = signal<QuestionStatus | ''>('');
  protected readonly fText = signal('');
  protected readonly filtered = computed(() => {
    const t = this.fText().toLowerCase();
    return (this.questions.value() ?? []).filter((q) =>
      (!this.fSubject() || q.subjectId === this.fSubject()) &&
      (!this.fStatus() || q.status === this.fStatus()) &&
      (!t || q.text.toLowerCase().includes(t) || q.chapter.toLowerCase().includes(t)));
  });
  protected readonly inReview = computed(() => (this.questions.value() ?? []).filter((q) => q.status === 'in_review'));

  // ---- editor
  protected readonly editingId = signal<string | null>(null);
  protected readonly editorOpen = signal(false);
  protected readonly form = this.fb.group({
    subjectId: ['', Validators.required],
    grade: [8, Validators.required],
    chapter: ['', Validators.required],
    text: ['', [Validators.required, Validators.minLength(5)]],
    options: this.fb.array([this.fb.control('', Validators.required), this.fb.control('', Validators.required), this.fb.control('', Validators.required), this.fb.control('', Validators.required)]),
    answerIndex: [0, Validators.required],
    marks: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    difficulty: ['easy' as Difficulty],
    explanation: ['', Validators.required],
  });
  protected get options(): FormArray {
    return this.form.controls.options;
  }

  protected readonly save = action((p: { id: string | null; body: Partial<Question> }) =>
    p.id ? this.api.patch<Question>(`questions/${p.id}`, p.body) : this.api.post<Question>('questions', p.body),
  );
  protected readonly setStatus = action((p: { id: string; status: QuestionStatus }) => this.api.patch<Question>(`questions/${p.id}`, { status: p.status }));

  protected newQuestion(): void {
    this.editingId.set(null);
    this.form.reset({ subjectId: this.subjects()[0]?.id ?? '', grade: 8, chapter: '', text: '', options: ['', '', '', ''], answerIndex: 0, marks: 1, difficulty: 'easy', explanation: '' });
    this.editorOpen.set(true);
  }

  protected edit(q: Question): void {
    this.editingId.set(q.id);
    this.form.reset({ ...q, answerIndex: q.answerIndex ?? 0, explanation: q.explanation ?? '' });
    this.editorOpen.set(true);
  }

  protected submit(status?: QuestionStatus): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body: Partial<Question> = { ...this.form.getRawValue(), grade: Number(this.form.value.grade) };
    if (status) body.status = status;
    this.save.run({ id: this.editingId(), body }, {
      success: (saved) => {
        this.replace(saved);
        this.editorOpen.set(false);
        this.toast.success(status === 'in_review' ? 'Sent for review.' : 'Question saved.');
      },
    });
  }

  protected changeStatus(q: Question, status: QuestionStatus): void {
    this.setStatus.run({ id: q.id, status }, { success: (saved) => { this.replace(saved); this.toast.success(`Question ${status === 'approved' ? 'approved' : 'returned to draft'}.`); } });
  }

  // ---- paper builder
  protected readonly picked = signal<string[]>([]);
  protected readonly builderSubject = signal('');
  protected readonly approvedForBuilder = computed(() => (this.questions.value() ?? []).filter((q) => q.status === 'approved' && (!this.builderSubject() || q.subjectId === this.builderSubject())));
  protected readonly pickedTotal = computed(() => (this.questions.value() ?? []).filter((q) => this.picked().includes(q.id)).reduce((s, q) => s + q.marks, 0));
  protected readonly paperForm = this.fb.group({ title: ['', Validators.required], classId: ['', Validators.required], durationMin: [30, [Validators.required, Validators.min(5)]] });
  protected readonly createPaper = action((body: Partial<Exam>) => this.api.post<Exam>('exams', body));

  protected togglePick(id: string, on: boolean): void {
    this.picked.update((list) => (on ? [...list, id] : list.filter((x) => x !== id)));
  }

  protected buildPaper(): void {
    const qs = (this.questions.value() ?? []).filter((q) => this.picked().includes(q.id));
    if (this.paperForm.invalid || !qs.length) {
      this.paperForm.markAllAsTouched();
      if (!qs.length) this.toast.show('Pick at least one approved question.', 'warning');
      return;
    }
    const v = this.paperForm.getRawValue();
    const start = new Date(Date.now() + 7 * 864e5);
    this.createPaper.run(
      {
        title: v.title, classId: v.classId, subjectId: qs[0].subjectId, questionIds: qs.map((q) => q.id), totalMarks: this.pickedTotal(),
        durationMin: v.durationMin, startAt: start.toISOString(), endAt: new Date(start.getTime() + 2 * 3600e3).toISOString(), status: 'draft', moderationRequired: false,
      },
      {
        success: (exam) => {
          this.toast.success('Paper created as a draft exam. Set the schedule and send it for approval.');
          void this.router.navigate(['/teacher/examinations', exam.id]);
        },
      },
    );
  }

  private replace(saved: Question): void {
    this.questions.update((list) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]));
  }
}
