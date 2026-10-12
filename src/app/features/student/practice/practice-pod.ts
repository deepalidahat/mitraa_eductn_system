import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/http/api.service';
import { GeneratedPractice, PracticeCatalogEntry, PracticeSession, Question } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { BarChart, Icon, LoadState, PageHeader, Tabs } from '@shared/ui';

type Stage = 'setup' | 'attempt' | 'review';

/**
 * PracticePod: Select grade / subject / chapter → Generate paper → Attempt online or print →
 * Solutions & explanations → Track history and improvement. Sharing with parents is opt-in.
 */
@Component({
  selector: 'app-practice-pod',
  imports: [FormsModule, DatePipe, PageHeader, LoadState, Tabs, BarChart, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './practice-pod.html',
  styleUrl: './practice-pod.scss',
})
export class PracticePod {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly tabs = [{ key: 'practice', label: 'Practice' }, { key: 'history', label: 'History & improvement' }];
  protected readonly tab = signal('practice');
  protected readonly stage = signal<Stage>('setup');

  // ---- scope selection
  protected readonly catalog = loader(() => true, () => this.api.get<PracticeCatalogEntry[]>('practice/chapters'));
  protected readonly grade = signal<number | null>(null);
  protected readonly subjectId = signal<string | null>(null);
  protected readonly chapter = signal<string>('');
  protected readonly count = signal(5);
  protected readonly shareWithParent = signal(true);

  protected readonly grades = computed(() => [...new Set((this.catalog.value() ?? []).map((c) => c.grade))].sort());
  protected readonly subjects = computed(() => (this.catalog.value() ?? []).filter((c) => c.grade === this.grade()).map((c) => c.subjectId));
  protected readonly chapters = computed(() => (this.catalog.value() ?? []).find((c) => c.grade === this.grade() && c.subjectId === this.subjectId())?.chapters ?? []);

  // ---- paper & attempt
  protected readonly paper = signal<GeneratedPractice | null>(null);
  protected readonly answers = signal<(number | null)[]>([]);
  protected readonly result = signal<PracticeSession | null>(null);
  protected readonly answered = computed(() => this.answers().filter((a) => a !== null).length);

  protected readonly generate = action((body: object) => this.api.post<GeneratedPractice>('practice/generate', body));
  protected readonly submit = action((body: object) => this.api.post<PracticeSession>('practiceSessions', body));
  protected readonly share = action((p: { id: string; shared: boolean }) => this.api.patch<PracticeSession>(`practiceSessions/${p.id}`, { sharedWithParent: p.shared }));

  // ---- history
  protected readonly history = loader(() => true, () => this.api.list<PracticeSession>('practiceSessions', { _sort: 'completedAt', _order: 'desc' }));
  protected readonly improvement = computed(() => {
    const byChapter = new Map<string, PracticeSession[]>();
    for (const s of [...(this.history.value() ?? [])].reverse()) byChapter.set(s.chapter, [...(byChapter.get(s.chapter) ?? []), s]);
    return [...byChapter].map(([chapter, list]) => {
      const pct = (s: PracticeSession) => Math.round((s.score / Math.max(1, s.total)) * 100);
      return { chapter, attempts: list.length, first: pct(list[0]), latest: pct(list[list.length - 1]) };
    });
  });
  protected readonly latestBars = computed(() => this.improvement().map((i) => ({ label: i.chapter, value: i.latest })));
  protected readonly reviewing = signal<PracticeSession | null>(null);
  private readonly reviewQuestions = signal<Question[]>([]);

  protected selectGrade(g: string): void {
    this.grade.set(Number(g));
    this.subjectId.set(null);
    this.chapter.set('');
  }

  protected selectSubject(s: string): void {
    this.subjectId.set(s);
    this.chapter.set('');
  }

  protected create(): void {
    if (!this.grade() || !this.subjectId()) return;
    this.generate.run({ grade: this.grade(), subjectId: this.subjectId(), chapter: this.chapter() || undefined, count: this.count() }, {
      success: (paper) => {
        this.paper.set(paper);
        this.answers.set(Array(paper.questions.length).fill(null));
        this.result.set(null);
        this.stage.set('attempt');
      },
    });
  }

  protected choose(i: number, o: number): void {
    this.answers.update((a) => a.map((v, k) => (k === i ? o : v)));
  }

  protected print(): void {
    window.print();
  }

  protected finish(mode: 'online' | 'print'): void {
    const p = this.paper()!;
    this.submit.run(
      { grade: p.grade, subjectId: p.subjectId, chapter: p.chapter ?? p.questions[0]?.chapter, questionIds: p.questions.map((q) => q.id), answers: this.answers(), mode, sharedWithParent: this.shareWithParent() },
      {
        success: (session) => {
          this.result.set(session);
          this.reviewQuestions.set(p.questions);
          this.stage.set('review');
          this.history.update((list) => [session, ...list]);
        },
      },
    );
  }

  protected restart(): void {
    this.paper.set(null);
    this.result.set(null);
    this.stage.set('setup');
  }

  /** Pairs each question with its solution for the review screen. */
  protected readonly review = computed(() => {
    const r = this.result();
    if (!r?.review) return [];
    return r.review.map((rv, i) => ({ q: this.reviewQuestions().find((q) => q.id === rv.questionId), rv, mine: r.answers[i] }));
  });

  protected openPast(s: PracticeSession): void {
    this.api.list<Question>('questions', { id: s.questionIds }).subscribe((qs) => {
      this.reviewQuestions.set(qs);
      this.result.set(s);
      this.paper.set(null);
      this.stage.set('review');
      this.tab.set('practice');
    });
  }

  protected toggleShare(s: PracticeSession): void {
    this.share.run({ id: s.id, shared: !s.sharedWithParent }, {
      success: (saved) => {
        this.history.update((list) => list.map((x) => (x.id === saved.id ? { ...x, sharedWithParent: saved.sharedWithParent } : x)));
        this.toast.success(saved.sharedWithParent ? 'Shared with your parent.' : 'No longer shared.');
      },
    });
  }
}
