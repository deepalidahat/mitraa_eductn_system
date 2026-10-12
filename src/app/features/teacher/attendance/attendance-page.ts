import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { AttendanceMark, AttendanceSheet } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

const MARKS: AttendanceMark[] = ['present', 'absent', 'late'];
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Teacher → Attendance: Mark Attendance, View Records. */
@Component({
  selector: 'app-attendance-page',
  imports: [FormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.scss',
})
export class AttendancePage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly marks = MARKS;
  protected readonly tabs = [{ key: 'mark', label: 'Mark Attendance' }, { key: 'records', label: 'View Records' }];
  protected readonly tab = signal('mark');

  protected readonly classes = computed(() => this.lookup.classes().filter((c) => this.auth.user()?.classIds?.includes(c.id)));
  protected readonly classId = linkedSignal(() => this.classes()[0]?.id ?? '');
  protected readonly date = signal(todayIso());
  protected readonly session = signal('Morning');
  protected readonly maxDate = todayIso();

  protected readonly roster = computed(() => this.lookup.studentsInClass(this.classId()));

  /** Existing sheet for the chosen class/date/session (to edit instead of duplicate). */
  protected readonly existing = loader(
    () => (this.classId() ? { classId: this.classId(), date: this.date(), session: this.session() } : null),
    (p) => this.api.list<AttendanceSheet>('attendance', p),
  );
  protected readonly sheet = computed(() => this.existing.value()?.[0] ?? null);
  protected readonly entries = signal<Record<string, AttendanceMark>>({});
  protected readonly summary = computed(() => {
    const vals = Object.values(this.entries());
    return MARKS.map((m) => ({ mark: m, count: vals.filter((v) => v === m).length }));
  });

  protected readonly records = loader(
    () => (this.classId() ? this.classId() : null),
    (classId) => this.api.list<AttendanceSheet>('attendance', { classId, _sort: 'date', _order: 'desc' }),
  );
  protected readonly openRecord = signal<string | null>(null);

  protected readonly save = action((p: { id?: string; body: object }) =>
    p.id ? this.api.patch<AttendanceSheet>(`attendance/${p.id}`, p.body) : this.api.post<AttendanceSheet>('attendance', p.body),
  );

  constructor() {
    // Pre-fill from a saved sheet, otherwise default everyone to present.
    effect(() => {
      const s = this.sheet();
      const roster = this.roster();
      if (this.existing.loading()) return;
      const next: Record<string, AttendanceMark> = {};
      roster.forEach((st) => (next[st.id] = s?.records.find((r) => r.studentId === st.id)?.status ?? 'present'));
      this.entries.set(next);
    });
  }

  protected set(studentId: string, mark: AttendanceMark): void {
    this.entries.update((e) => ({ ...e, [studentId]: mark }));
  }

  protected markAll(mark: AttendanceMark): void {
    this.entries.update((e) => Object.fromEntries(Object.keys(e).map((k) => [k, mark])));
  }

  protected submit(): void {
    const records = Object.entries(this.entries()).map(([studentId, status]) => ({ studentId, status }));
    const body = { classId: this.classId(), date: this.date(), session: this.session(), records };
    this.save.run({ id: this.sheet()?.id, body }, {
      success: (saved) => {
        this.existing.set([saved]);
        this.records.update((list) => [saved, ...list.filter((r) => r.id !== saved.id)]);
        this.toast.success('Attendance saved.');
      },
    });
  }

  protected count(s: AttendanceSheet, mark: AttendanceMark): number {
    return s.records.filter((r) => r.status === mark).length;
  }
}
