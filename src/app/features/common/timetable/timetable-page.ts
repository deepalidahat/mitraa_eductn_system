import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { TimetableSlot } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader } from '@shared/ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * My Classes & Timetable (student / teacher).
 * Timetable grid on the web, a simple daily agenda on mobile.
 */
@Component({
  selector: 'app-timetable-page',
  imports: [PageHeader, LoadState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timetable-page.html',
  styleUrl: './timetable-page.scss',
})
export class TimetablePage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly lookup = inject(LookupService);

  protected readonly days = DAYS;
  protected readonly isTeacher = computed(() => this.auth.role() === 'teacher');
  private readonly classIds = computed(() => {
    const u = this.auth.user();
    return u?.role === 'teacher' ? u.classIds ?? [] : u?.classId ? [u.classId] : [];
  });
  protected readonly myClasses = computed(() => this.lookup.classes().filter((c) => this.classIds().includes(c.id)));

  protected readonly slots = loader(
    () => (this.classIds().length ? this.classIds() : null),
    (classId) => this.api.list<TimetableSlot>('timetable', { classId, _sort: 'period' }),
  );

  /** Teachers see only their own periods across classes. */
  private readonly mine = computed(() => {
    const all = this.slots.value() ?? [];
    return this.isTeacher() ? all.filter((s) => s.teacherId === this.auth.user()?.id) : all;
  });
  protected readonly periods = computed(() => [...new Set((this.slots.value() ?? []).map((s) => s.period))].sort((a, b) => a - b));
  protected readonly times = computed(() => new Map((this.slots.value() ?? []).map((s) => [s.period, s.time])));

  protected readonly today = signal(DAYS[Math.min(Math.max(new Date().getDay() - 1, 0), 4)]);
  protected readonly agenda = computed(() => this.mine().filter((s) => s.day === this.today()).sort((a, b) => a.period - b.period));
  protected readonly periodCount = computed(() => this.mine().length);

  protected cell(day: string, period: number): TimetableSlot[] {
    return this.mine().filter((s) => s.day === day && s.period === period);
  }
}
