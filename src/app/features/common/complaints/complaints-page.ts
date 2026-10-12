import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Complaint, ComplaintStatus } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { orDefault } from '@shared/utils/route-input';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

const CATEGORIES = ['Academic', 'Transport', 'Facilities', 'Fees', 'Safety', 'Other'];
type View = 'active' | 'escalated' | 'closed';

/**
 * Complaint / Grievance workflow:
 * Submit → Ticket with tracking ID → Owner + SLA → Investigation & resolution → Notify / reopen.
 * - Students, parents, staff (complaint:create): raise + track own tickets, reopen if unresolved.
 * - Principal (complaint:manage): View & Track all campus tickets, progress, resolve, escalate.
 */
@Component({
  selector: 'app-complaints-page',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './complaints-page.html',
})
export class ComplaintsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  readonly heading = input('Complaints', { transform: orDefault('Complaints') });

  protected readonly categories = CATEGORIES;
  protected readonly manage = computed(() => this.auth.can('complaint:manage'));
  protected readonly canCreate = computed(() => this.auth.can('complaint:create'));
  protected readonly now = Date.now();

  protected readonly complaints = loader(
    () => this.auth.user()?.id,
    () => this.api.list<Complaint>('complaints', { _sort: 'createdAt', _order: 'desc' }),
  );

  protected readonly view = signal<View>('active');
  private readonly isClosed = (c: Complaint) => c.status === 'resolved' || c.status === 'closed';
  protected readonly tabs = computed(() => {
    const list = this.complaints.value() ?? [];
    return [
      { key: 'active', label: 'Open', count: list.filter((c) => !this.isClosed(c)).length },
      { key: 'escalated', label: 'Escalations', count: list.filter((c) => c.escalated && !this.isClosed(c)).length },
      { key: 'closed', label: 'Resolved', count: list.filter((c) => this.isClosed(c)).length },
    ];
  });
  protected readonly visible = computed(() => {
    const list = this.complaints.value() ?? [];
    switch (this.view()) {
      case 'escalated': return list.filter((c) => c.escalated && !this.isClosed(c));
      case 'closed': return list.filter((c) => this.isClosed(c));
      default: return list.filter((c) => !this.isClosed(c));
    }
  });

  protected readonly selectedId = linkedSignal(() => this.visible()[0]?.id ?? null);
  protected readonly selected = computed(() => (this.complaints.value() ?? []).find((c) => c.id === this.selectedId()) ?? null);
  protected readonly composing = signal(false);
  protected readonly note = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    category: ['Academic', Validators.required],
    subject: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(15)]],
  });

  protected readonly create = action((body: object) => this.api.post<Complaint>('complaints', body));
  protected readonly change = action((p: { id: string; body: object }) => this.api.patch<Complaint>(`complaints/${p.id}`, p.body));

  protected slaBreached(c: Complaint): boolean {
    return !this.isClosed(c) && Date.parse(c.slaDueAt) < this.now;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.create.run(this.form.getRawValue(), {
      success: (c) => {
        this.complaints.update((list) => [c, ...list]);
        this.toast.success(`Complaint submitted. Tracking ID ${c.trackingId}.`);
        this.form.reset({ category: 'Academic', subject: '', description: '' });
        this.composing.set(false);
        this.view.set('active');
        this.selectedId.set(c.id);
      },
    });
  }

  protected update(c: Complaint, status: ComplaintStatus | null, escalate = false): void {
    const note = this.note().trim() || (escalate ? 'Escalated for priority handling' : `Status changed to ${status}`);
    const body = escalate ? { escalated: true, note } : { status, note };
    this.change.run({ id: c.id, body }, {
      success: (saved) => {
        this.complaints.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        this.note.set('');
        this.toast.success('Complaint updated.');
      },
    });
  }
}
