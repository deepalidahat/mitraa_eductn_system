import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiService } from '../http/api.service';
import { Campus, SchoolClass, Student, Subject } from '../models';

interface Lookups {
  subjects: Subject[];
  classes: SchoolClass[];
  campuses: Campus[];
  students: Student[];
}

const EMPTY_LOOKUPS: Lookups = { subjects: [], classes: [], campuses: [], students: [] };

/**
 * Reference data the signed-in user is allowed to see, fetched once per session.
 * Keyed on the user id: logging out (or switching account) drops it automatically.
 */
@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly data = toSignal(
    toObservable(computed(() => this.auth.user()?.id ?? null)).pipe(
      distinctUntilChanged(),
      switchMap((userId) =>
        userId
          ? forkJoin({
              subjects: this.api.list<Subject>('subjects'),
              classes: this.api.list<SchoolClass>('classes'),
              campuses: this.api.list<Campus>('campuses'),
              students: this.api.list<Student>('students', { _sort: 'rollNo' }),
            }).pipe(catchError(() => of(EMPTY_LOOKUPS)))
          : of(EMPTY_LOOKUPS),
      ),
    ),
    { initialValue: EMPTY_LOOKUPS },
  );

  readonly subjects = computed(() => this.data().subjects);
  readonly classes = computed(() => this.data().classes);
  readonly campuses = computed(() => this.data().campuses);
  readonly students = computed(() => this.data().students);

  private readonly subjectMap = computed(() => new Map(this.subjects().map((s) => [s.id, s.name])));
  private readonly classMap = computed(() => new Map(this.classes().map((c) => [c.id, c.name])));
  private readonly campusMap = computed(() => new Map(this.campuses().map((c) => [c.id, c.name])));
  private readonly studentMap = computed(() => new Map(this.students().map((s) => [s.id, s])));

  subjectName = (id: string | null | undefined): string => (id && this.subjectMap().get(id)) || id || '—';
  className = (id: string | null | undefined): string => (id && this.classMap().get(id)) || id || '—';
  campusName = (id: string | null | undefined): string => (id && this.campusMap().get(id)) || id || '—';
  student = (id: string | null | undefined): Student | undefined => (id ? this.studentMap().get(id) : undefined);
  studentName = (id: string | null | undefined): string => this.student(id)?.name ?? id ?? '—';
  studentsInClass = (classId: string): Student[] => this.students().filter((s) => s.classId === classId);
}
