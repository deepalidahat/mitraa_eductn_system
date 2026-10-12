import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Notice, NoticeAck, ROLES, Role } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { HasPermission } from '@shared/directives/has-permission';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

type Filter = 'all' | 'pending-ack' | 'drafts';

/**
 * Notices for every role.
 * - Everyone: list + detail with audience and publish date.
 * - Parents (notice:ack): View & Acknowledge.
 * - Principal, and management if permitted (notice:publish): Create & Publish.
 */
@Component({
  selector: 'app-notices-page',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Tabs, Icon, RelativeTimePipe, HasPermission],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notices-page.html',
})
export class NoticesPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly ctx = inject(ContextService);

  /** Query param ?id= opens a notice directly. */
  readonly id = input<string>();

  protected readonly canPublish = computed(() => this.auth.can('notice:publish'));
  protected readonly canAck = computed(() => this.auth.can('notice:ack'));
  protected readonly roles = ROLES.filter((r) => !r.phase2);

  protected readonly notices = loader(
    () => this.auth.user()?.id,
    () => this.api.list<Notice>('notices', { _sort: 'publishedAt', _order: 'desc' }),
  );
  protected readonly acks = loader(
    () => (this.canAck() ? this.auth.user()?.id : null),
    (userId) => (userId ? this.api.list<NoticeAck>('noticeAcks', { userId }) : of([])),
  );
  private readonly ackedIds = computed(() => new Set((this.acks.value() ?? []).map((a) => a.noticeId)));

  protected readonly filter = signal<Filter>('all');
  protected readonly tabs = computed(() => {
    const list = this.notices.value() ?? [];
    const tabs = [{ key: 'all', label: 'All', count: list.filter((n) => n.status === 'published').length }];
    if (this.canAck()) tabs.push({ key: 'pending-ack', label: 'To acknowledge', count: list.filter((n) => this.needsAck(n)).length });
    if (this.canPublish()) tabs.push({ key: 'drafts', label: 'Drafts', count: list.filter((n) => n.status === 'draft').length });
    return tabs;
  });

  protected readonly visible = computed(() => {
    const list = this.notices.value() ?? [];
    switch (this.filter()) {
      case 'pending-ack': return list.filter((n) => this.needsAck(n));
      case 'drafts': return list.filter((n) => n.status === 'draft');
      default: return list.filter((n) => n.status === 'published');
    }
  });

  protected readonly selectedId = linkedSignal(() => this.id() ?? null);
  protected readonly selected = computed(() => (this.notices.value() ?? []).find((n) => n.id === this.selectedId()) ?? null);
  protected readonly composing = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['Academic', Validators.required],
    body: ['', [Validators.required, Validators.minLength(10)]],
    audience: [['student', 'parent', 'teacher'] as Role[], Validators.required],
    requiresAck: [false],
  });

  protected readonly acknowledge = action((noticeId: string) => this.api.post<NoticeAck>('noticeAcks', { noticeId }));
  protected readonly save = action((body: Partial<Notice>) => this.api.post<Notice>('notices', body));
  protected readonly publishDraft = action((id: string) => this.api.patch<Notice>(`notices/${id}`, { status: 'published' }));

  protected needsAck(n: Notice): boolean {
    return this.canAck() && n.status === 'published' && n.requiresAck && !this.ackedIds().has(n.id);
  }

  protected isAcked(n: Notice): boolean {
    return this.ackedIds().has(n.id);
  }

  protected audienceLabel(n: Notice): string {
    return n.audience.map((r) => ROLES.find((m) => m.role === r)?.label ?? r).join(', ');
  }

  protected toggleAudience(role: Role, checked: boolean): void {
    const current = this.form.controls.audience.value;
    this.form.controls.audience.setValue(checked ? [...current, role] : current.filter((r) => r !== role));
  }

  protected doAck(n: Notice): void {
    this.acknowledge.run(n.id, {
      success: (ack) => {
        this.acks.update((list) => [...list, ack]);
        this.toast.success('Notice acknowledged.');
      },
    });
  }

  protected submit(status: 'draft' | 'published'): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.run({ ...this.form.getRawValue(), status, campusIds: this.ctx.campusScope() }, {
      success: (saved) => {
        this.notices.update((list) => [saved, ...list]);
        this.toast.success(status === 'published' ? 'Notice published.' : 'Draft saved.');
        this.composing.set(false);
        this.form.reset();
        this.filter.set(status === 'published' ? 'all' : 'drafts');
        this.selectedId.set(saved.id);
      },
    });
  }

  protected publish(n: Notice): void {
    this.publishDraft.run(n.id, {
      success: (saved) => {
        this.notices.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        this.toast.success('Notice published.');
        this.filter.set('all');
      },
    });
  }
}
