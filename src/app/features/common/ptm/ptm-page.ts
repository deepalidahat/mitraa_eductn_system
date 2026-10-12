import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Ptm, TimetableSlot } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { orDefault } from '@shared/utils/route-input';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

type View = 'upcoming' | 'requests' | 'past';

/**
 * Parent–Teacher meetings:
 * Parent request → Teacher schedules → Meeting → Action plan with due date → Follow-up & closure.
 * - student: view only        - parent: Book PTM, View Meeting Notes, Action Plan & Follow-up
 * - teacher: schedule requests, record notes & action plan, close.
 */
@Component({
  selector: 'app-ptm',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ptm-page.html',
})
export class PtmPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly heading = input('PTM / Meetings', { transform: orDefault('PTM / Meetings') });
  readonly embedded = input(false);
  /** Open the booking form straight away (parent "Request PTM"). */
  readonly startBooking = input(false);

  protected readonly role = this.auth.role;
  protected readonly isParent = computed(() => this.role() === 'parent');
  protected readonly isTeacher = computed(() => this.role() === 'teacher');
  protected readonly now = Date.now();

  protected readonly ptms = loader(
    () => ({ child: this.isParent() ? this.ctx.activeChildId() : null, user: this.auth.user()?.id }),
    (p) => this.api.list<Ptm>('ptms', { studentId: p.child, _sort: 'requestedAt', _order: 'desc' }),
  );

  protected readonly view = linkedSignal<View>(() => (this.isTeacher() ? 'requests' : 'upcoming'));
  private readonly isPast = (p: Ptm) => p.status === 'completed' || p.status === 'closed';
  protected readonly tabs = computed(() => {
    const list = this.ptms.value() ?? [];
    return [
      { key: 'upcoming', label: 'Upcoming', count: list.filter((p) => p.status === 'scheduled').length },
      { key: 'requests', label: 'Requests', count: list.filter((p) => p.status === 'requested').length },
      { key: 'past', label: 'Past & follow-up', count: list.filter(this.isPast).length },
    ];
  });
  protected readonly visible = computed(() => {
    const list = this.ptms.value() ?? [];
    const v = this.view();
    return list.filter((p) => (v === 'upcoming' ? p.status === 'scheduled' : v === 'requests' ? p.status === 'requested' : this.isPast(p)));
  });
  protected readonly selectedId = linkedSignal(() => this.visible()[0]?.id ?? null);
  protected readonly selected = computed(() => this.ptms.value()?.find((p) => p.id === this.selectedId()) ?? null);

  // ---- parent: booking
  protected readonly booking = linkedSignal(() => this.startBooking());
  private readonly childClass = computed(() => (this.isParent() ? this.ctx.activeChild()?.classId ?? null : null));
  private readonly slots = loader(this.childClass, (classId) => (classId ? this.api.list<TimetableSlot>('timetable', { classId }) : of([] as TimetableSlot[])));
  protected readonly teachers = computed(() => {
    const map = new Map<string, string>();
    (this.slots.value() ?? []).forEach((s) => map.set(s.teacherId, s.teacherName));
    return [...map].map(([id, name]) => ({ id, name }));
  });
  protected readonly bookForm = this.fb.group({
    teacherId: ['', Validators.required],
    agenda: ['', [Validators.required, Validators.minLength(5)]],
    mode: ['in-person' as Ptm['mode']],
  });

  // ---- teacher: schedule / notes / action plan
  protected readonly scheduleForm = this.fb.group({ slot: ['', Validators.required], mode: ['in-person' as Ptm['mode']], meetingLink: [''] });
  protected readonly notesForm = this.fb.group({
    notes: ['', [Validators.required, Validators.minLength(5)]],
    items: ['', Validators.required],
    dueDate: ['', Validators.required],
  });
  protected readonly followUp = signal('');

  protected readonly create = action((body: object) => this.api.post<Ptm>('ptms', body));
  protected readonly patch = action((p: { id: string; body: object; msg: string }) => this.api.patch<Ptm>(`ptms/${p.id}`, p.body));

  protected book(): void {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();
      return;
    }
    const child = this.ctx.activeChild()!;
    const { teacherId, agenda, mode } = this.bookForm.getRawValue();
    const teacherName = this.teachers().find((t) => t.id === teacherId)?.name ?? '';
    this.create.run({ teacherId, teacherName, studentId: child.id, studentName: child.name, agenda, mode }, {
      success: (p) => {
        this.ptms.update((list) => [p, ...list]);
        this.booking.set(false);
        this.bookForm.reset({ teacherId: '', agenda: '', mode: 'in-person' });
        this.view.set('requests');
        this.selectedId.set(p.id);
        this.toast.success('PTM requested. The teacher will confirm a slot.');
      },
    });
  }

  protected schedule(p: Ptm): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    const v = this.scheduleForm.getRawValue();
    this.run(p, { status: 'scheduled', slot: new Date(v.slot).toISOString(), mode: v.mode, meetingLink: v.mode === 'online' ? v.meetingLink : undefined }, 'Meeting scheduled.', 'upcoming');
  }

  protected complete(p: Ptm): void {
    if (this.notesForm.invalid) {
      this.notesForm.markAllAsTouched();
      return;
    }
    const v = this.notesForm.getRawValue();
    const items = v.items.split('\n').map((s) => s.trim()).filter(Boolean);
    this.run(p, { status: 'completed', notes: v.notes, actionPlan: { items, dueDate: v.dueDate, status: 'in_progress', owner: this.auth.user()!.name } }, 'Notes and action plan saved.', 'past');
  }

  protected close(p: Ptm): void {
    this.run(p, { status: 'closed', actionPlan: p.actionPlan ? { ...p.actionPlan, status: 'done' } : null }, 'Meeting closed.', 'past');
  }

  protected sendFollowUp(p: Ptm): void {
    const text = this.followUp().trim();
    if (!text) return;
    this.run(p, { followUp: text }, 'Follow-up sent to the teacher.');
    this.followUp.set('');
  }

  protected overdue(p: Ptm): boolean {
    return !!p.actionPlan && p.actionPlan.status !== 'done' && Date.parse(p.actionPlan.dueDate) < this.now;
  }

  private run(p: Ptm, body: object, msg: string, view?: View): void {
    this.patch.run({ id: p.id, body, msg }, {
      success: (saved) => {
        this.ptms.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        if (view) this.view.set(view);
        this.selectedId.set(saved.id);
        this.toast.success(msg);
      },
    });
  }
}
