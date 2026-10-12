import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Thread, ThreadMessage, ThreadType, TimetableSlot } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { InitialsPipe } from '@shared/pipes/initials-pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { orDefault } from '@shared/utils/route-input';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

interface Recipient {
  id: string;
  name: string;
  hint: string;
}

/**
 * Conversation threads, reused for:
 * - Student: Messages (Academic Doubt)            threadTypes = ['doubt']
 * - Parent: Communication → Message Teacher        threadTypes = ['parent-query', 'progress-share'] (selected child only)
 * - Teacher: Parent Communication → Respond / Share progress
 * Inputs are bound from route data, or set when embedded.
 */
@Component({
  selector: 'app-threads',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Icon, RelativeTimePipe, InitialsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './threads-page.html',
  styleUrl: './threads-page.scss',
})
export class ThreadsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  readonly threadTypes = input<ThreadType[], ThreadType[] | undefined>(['doubt'], { transform: orDefault<ThreadType[]>(['doubt']) });
  /** Type used for new conversations started from this page. */
  readonly composeType = input<ThreadType, ThreadType | undefined>('doubt', { transform: orDefault<ThreadType>('doubt') });
  readonly heading = input('Messages', { transform: orDefault('Messages') });
  readonly subtitle = input<string | null>(null);
  readonly composeLabel = input('New message', { transform: orDefault('New message') });
  readonly embedded = input(false);

  protected readonly me = this.auth.user;
  protected readonly role = this.auth.role;

  /** Parents always work inside the selected child; switching child reloads the list. */
  private readonly params = computed(() => ({
    types: this.threadTypes(),
    studentId: this.role() === 'parent' ? this.ctx.activeChildId() : null,
  }));

  protected readonly threads = loader(this.params, (p) =>
    this.api.list<Thread>('threads', { type: p.types, studentId: p.studentId, _sort: 'updatedAt', _order: 'desc' }),
  );

  protected readonly selectedId = linkedSignal(() => this.threads.value()?.[0]?.id ?? null);
  protected readonly selected = computed(() => this.threads.value()?.find((t) => t.id === this.selectedId()) ?? null);
  protected readonly composing = signal(false);
  protected readonly reply = signal('');

  /** Who can be messaged: the selected child's / own class teachers, or (teachers) guardians of their students. */
  private readonly classForRecipients = computed(() => {
    const u = this.me();
    if (u?.role === 'student') return u.classId ?? null;
    if (u?.role === 'parent') return this.ctx.activeChild()?.classId ?? null;
    return null;
  });
  private readonly teacherSlots = loader(this.classForRecipients, (classId) =>
    classId ? this.api.list<TimetableSlot>('timetable', { classId }) : of([] as TimetableSlot[]),
  );
  protected readonly recipients = computed<Recipient[]>(() => {
    if (this.role() === 'teacher') {
      return this.lookup.students()
        .filter((s) => s.guardianIds.length)
        .map((s) => ({ id: s.id, name: `Guardian of ${s.name}`, hint: this.lookup.className(s.classId) }));
    }
    const seen = new Map<string, Recipient>();
    for (const s of this.teacherSlots.value() ?? []) {
      const prev = seen.get(s.teacherId);
      const subject = this.lookup.subjectName(s.subjectId);
      seen.set(s.teacherId, { id: s.teacherId, name: s.teacherName, hint: prev && !prev.hint.includes(subject) ? `${prev.hint}, ${subject}` : prev?.hint ?? subject });
    }
    return [...seen.values()];
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    recipient: ['', Validators.required],
    subject: ['', [Validators.required, Validators.maxLength(100)]],
    text: ['', [Validators.required, Validators.minLength(2)]],
  });

  protected readonly send = action((p: { thread: Thread; text: string }) =>
    this.api.patch<Thread>(`threads/${p.thread.id}`, { messages: [...p.thread.messages, this.message(p.text)], status: 'open' }),
  );
  protected readonly resolve = action((t: Thread) => this.api.patch<Thread>(`threads/${t.id}`, { status: 'resolved' }));
  protected readonly start = action((body: Partial<Thread>) => this.api.post<Thread>('threads', body));

  protected isMine(m: ThreadMessage): boolean {
    return m.fromId === this.me()?.id;
  }

  protected sendReply(t: Thread): void {
    const text = this.reply().trim();
    if (!text) return;
    this.send.run({ thread: t, text }, {
      success: (saved) => {
        this.replace(saved);
        this.reply.set('');
      },
    });
  }

  protected markResolved(t: Thread): void {
    this.resolve.run(t, { success: (saved) => { this.replace(saved); this.toast.success('Marked as resolved.'); } });
  }

  protected compose(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { recipient, subject, text } = this.form.getRawValue();
    const role = this.role();
    let studentId: string | null;
    let participantIds: string[];
    let counterpartName: string;

    if (role === 'teacher') {
      const student = this.lookup.student(recipient)!;
      studentId = student.id;
      participantIds = student.guardianIds;
      counterpartName = `Guardian of ${student.name}`;
    } else {
      const r = this.recipients().find((x) => x.id === recipient)!;
      studentId = role === 'student' ? this.me()?.studentId ?? null : this.ctx.activeChildId();
      participantIds = [r.id];
      counterpartName = r.name;
    }

    this.start.run(
      { type: this.composeType(), subject, studentId: studentId ?? undefined, participantIds, counterpartName, messages: [this.message(text)] },
      {
        success: (t) => {
          this.threads.update((list) => [t, ...list]);
          this.selectedId.set(t.id);
          this.composing.set(false);
          this.form.reset();
          this.toast.success('Message sent.');
        },
      },
    );
  }

  private message(text: string): ThreadMessage {
    const u = this.me()!;
    return { id: `m_${Date.now()}`, fromId: u.id, fromName: u.name, text, at: new Date().toISOString() };
  }

  private replace(saved: Thread): void {
    this.threads.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
  }
}
