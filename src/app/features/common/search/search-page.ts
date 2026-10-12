import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Assignment, Material, Notice } from '@core/models';
import { NAVIGATION } from '@core/navigation/navigation';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader } from '@shared/ui';

interface Hit {
  title: string;
  meta: string;
  link: string;
  queryParams?: Record<string, string>;
}

/** Search across students, classes and content - limited to what the user is authorized to see. */
@Component({
  selector: 'app-search-page',
  imports: [FormsModule, RouterLink, PageHeader, Icon, LoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Search" subtitle="Students, classes, pages and content you have access to." />
      <form role="search" class="cluster" (submit)="$event.preventDefault(); go()">
        <label class="sr-only" for="q">Search</label>
        <input id="q" type="search" class="input" style="flex:1;min-width:220px" [ngModel]="term()" (ngModelChange)="term.set($event)" name="q"
          placeholder="Try a student name, class, subject or notice…" />
        <button class="btn btn--primary" type="submit"><app-icon name="search" [size]="18" /> Search</button>
      </form>

      @if (q()) {
        <app-load-state [loader]="content" [skeletons]="2" />
        @for (g of groups(); track g.title) {
          <section class="card" [attr.aria-label]="g.title">
            <div class="card__header"><h2 class="card__title">{{ g.title }}</h2><span class="badge">{{ g.hits.length }}</span></div>
            <ul class="list">
              @for (h of g.hits; track $index) {
                <li>
                  <a class="list-row list-row--link" [routerLink]="h.link" [queryParams]="h.queryParams">
                    <span class="list-row__body"><span class="list-row__title">{{ h.title }}</span><span class="list-row__meta">{{ h.meta }}</span></span>
                    <app-icon name="chevron-right" [size]="18" class="subtle" />
                  </a>
                </li>
              }
            </ul>
          </section>
        } @empty {
          @if (!content.loading()) {
            <p class="card muted">No results for "{{ q() }}".</p>
          }
        }
      }
    </div>
  `,
})
export class SearchPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(LookupService);
  private readonly router = inject(Router);

  /** Query param binding. */
  readonly q = input<string>('');
  protected readonly term = linkedSignal(() => this.q() ?? '');
  private readonly base = computed(() => this.auth.homeUrl());

  protected readonly content = loader(
    () => (this.q()?.trim() ? this.q().trim() : null),
    (q) =>
      forkJoin({
        notices: this.api.list<Notice>('notices', { q }).pipe(catchError(() => of([]))),
        materials: this.api.list<Material>('materials', { q }).pipe(catchError(() => of([]))),
        assignments: this.api.list<Assignment>('assignments', { q }).pipe(catchError(() => of([]))),
      }),
  );

  protected readonly groups = computed(() => {
    const q = (this.q() ?? '').trim().toLowerCase();
    if (!q) return [];
    const role = this.auth.role()!;
    const base = this.base();
    const has = (s: string) => s.toLowerCase().includes(q);
    const c = this.content.value();

    const pages: Hit[] = NAVIGATION[role].filter((n) => has(n.label) || has(n.hint ?? '')).map((n) => ({
      title: n.label, meta: n.hint ?? 'Page', link: n.path ? `${base}/${n.path}` : base,
    }));
    const students: Hit[] = role === 'parent' || role === 'student' ? [] : this.lookup.students().filter((s) => has(s.name)).map((s) => ({
      title: s.name, meta: `${this.lookup.className(s.classId)} · Roll ${s.rollNo}`, link: role === 'teacher' ? `${base}/student-support` : `${base}/student-performance`,
    }));
    const classes: Hit[] = this.lookup.classes().filter((k) => has(k.name)).map((k) => ({
      title: k.name, meta: `${this.lookup.campusName(k.campusId)} · Room ${k.room}`, link: `${base}/classes`,
    }));
    const content: Hit[] = [
      ...(c?.notices ?? []).map((n) => ({ title: n.title, meta: `Notice · ${n.category}`, link: `${base}/notices`, queryParams: { id: n.id } })),
      ...(c?.assignments ?? []).map((a) => ({ title: a.title, meta: `Assignment · ${this.lookup.subjectName(a.subjectId)}`, link: `${base}/assignments` })),
      ...(c?.materials ?? []).filter(() => role === 'student').map((m) => ({ title: m.title, meta: `Study material · ${m.type}`, link: `${base}/downloads` })),
    ];

    return [
      { title: 'Pages', hits: pages },
      { title: 'Students', hits: students },
      { title: 'Classes', hits: classes },
      { title: 'Content', hits: content },
    ].filter((g) => g.hits.length);
  });

  protected go(): void {
    void this.router.navigate([], { queryParams: { q: this.term().trim() || null } });
  }
}
