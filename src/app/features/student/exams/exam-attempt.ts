import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, interval, map, of, switchMap } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Exam, ExamAttempt, Question } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { StorageService } from '@core/state/storage.service';
import { action, loader } from '@core/state/loader';
import { examWindow } from '@features/common/academics/academic-status';
import { Icon, LoadState, PageHeader } from '@shared/ui';

type Stage = 'intro' | 'attempt' | 'review' | 'done';

/**
 * Timed exam attempt. Opens only inside the exam window (the API enforces it too),
 * survives a page refresh, warns at 1 minute and auto-submits when time is up.
 */
@Component({
  selector: 'app-exam-attempt',
  imports: [RouterLink, DatePipe, PageHeader, LoadState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-attempt.html',
  styleUrl: './exam-attempt.scss',
})
export class ExamAttemptPage {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly lookup = inject(LookupService);

  readonly id = input.required<string>();

  protected readonly data = loader(
    () => this.id(),
    (id) =>
      forkJoin({
        exam: this.api.get<Exam>(`exams/${id}`),
        attempts: this.api.list<ExamAttempt>('examAttempts', { examId: id }),
      }).pipe(
        switchMap(({ exam, attempts }) =>
          (exam.questionIds.length ? this.api.list<Question>('questions', { id: exam.questionIds }) : of([] as Question[])).pipe(
            // keep the paper order
            map((qs) => ({ exam, attempts, questions: exam.questionIds.map((qid) => qs.find((q) => q.id === qid)).filter((q): q is Question => !!q) })),
          ),
        ),
      ),
  );

  protected readonly exam = computed(() => this.data.value()?.exam);
  protected readonly questions = computed(() => this.data.value()?.questions ?? []);
  protected readonly window = computed(() => {
    const d = this.data.value();
    return d ? examWindow(d.exam, d.attempts[0]) : null;
  });

  protected readonly stage = signal<Stage>('intro');
  protected readonly answers = signal<(number | null)[]>([]);
  protected readonly current = signal(0);
  protected readonly answered = computed(() => this.answers().filter((a) => a !== null && a !== undefined).length);
  protected readonly secondsLeft = signal(0);
  protected readonly clock = computed(() => {
    const s = Math.max(0, this.secondsLeft());
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });

  protected readonly submit = action((answers: (number | null)[]) => this.api.post<ExamAttempt>('examAttempts', { examId: this.id(), answers }));

  private get key(): string {
    return `exam.${this.id()}`;
  }

  constructor() {
    // Resume an attempt in progress (e.g. after an accidental refresh).
    effect(() => {
      const e = this.exam();
      if (!e || this.stage() !== 'intro' || this.window() !== 'open') return;
      const saved = this.storage.read<{ startedAt: number; answers: (number | null)[] }>(this.key, 'session');
      if (saved) this.begin(saved.startedAt, saved.answers);
    });
  }

  protected start(): void {
    this.begin(Date.now(), Array(this.questions().length).fill(null));
  }

  protected choose(qIndex: number, option: number): void {
    this.answers.update((list) => {
      const next = [...list];
      next[qIndex] = option;
      return next;
    });
    this.storage.write(this.key, { startedAt: this.startedAt, answers: this.answers() }, 'session');
  }

  protected finish(): void {
    this.submit.run(this.answers(), {
      success: () => {
        this.storage.remove(this.key, 'session');
        this.stage.set('done');
      },
    });
  }

  private startedAt = 0;

  private begin(startedAt: number, answers: (number | null)[]): void {
    const e = this.exam()!;
    this.startedAt = startedAt;
    this.answers.set(answers);
    this.stage.set('attempt');
    this.storage.write(this.key, { startedAt, answers }, 'session');
    // Deadline = whichever comes first: attempt duration or end of the exam window.
    const deadline = Math.min(startedAt + e.durationMin * 60_000, Date.parse(e.endAt));
    const tick = () => this.secondsLeft.set(Math.round((deadline - Date.now()) / 1000));
    tick();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        tick();
        if (this.secondsLeft() <= 0 && (this.stage() === 'attempt' || this.stage() === 'review') && !this.submit.pending()) {
          this.finish();
        }
      });
  }
}
