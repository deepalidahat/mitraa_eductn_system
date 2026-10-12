import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Approval, Notice } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { RelativeTimePipe } from '@shared/pipes/relative-time-pipe';
import { orDefault } from '@shared/utils/route-input';
import { Icon, LoadState, PageHeader, StatusBadge, Tabs } from '@shared/ui';

const CATEGORY_LABEL: Record<string, string> = { staff: 'Staff', exam: 'Exam', other: 'Other', major: 'Major' };

/**
 * Approvals.
 * - Principal: Staff / Exam / Other (campus level)
 * - Management: Policy & Approvals → Major Approvals + Notices / Circulars
 * Decision controls only for users with approval:decide; the API re-checks.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [FormsModule, DatePipe, RouterLink, PageHeader, LoadState, StatusBadge, Tabs, Icon, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './approvals-page.html',
})
export class ApprovalsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  readonly heading = input('Approvals', { transform: orDefault('Approvals') });
  readonly subtitle = input('Review pending requests and record decisions.', { transform: orDefault('Review pending requests and record decisions.') });
  readonly categories = input<Approval['category'][], Approval['category'][] | undefined>(['staff', 'exam', 'other'], { transform: orDefault<Approval['category'][]>(['staff', 'exam', 'other']) });
  readonly showCirculars = input(false);

  protected readonly canDecide = computed(() => this.auth.can('approval:decide'));
  protected readonly base = computed(() => this.auth.homeUrl());

  protected readonly approvals = loader(
    () => ({ category: this.categories() }),
    (p) => this.api.list<Approval>('approvals', { category: p.category, _sort: 'requestedAt', _order: 'desc' }),
  );
  protected readonly circulars = loader(
    () => (this.showCirculars() ? 'Circular' : null),
    (category) => this.api.list<Notice>('notices', { category, _sort: 'publishedAt', _order: 'desc' }),
  );

  /** Management sees only the campuses currently in scope. */
  private readonly scoped = computed(() => {
    const scope = new Set(this.ctx.campusScope());
    return (this.approvals.value() ?? []).filter((a) => this.auth.role() !== 'management' || scope.has(a.campusId));
  });

  protected readonly view = signal<string>('pending');
  protected readonly category = signal<string>('all');
  protected readonly tabs = computed(() => {
    const list = this.scoped();
    const tabs = [
      { key: 'pending', label: 'Pending', count: list.filter((a) => a.status === 'pending').length },
      { key: 'decided', label: 'Decided', count: list.filter((a) => a.status !== 'pending').length },
    ];
    if (this.showCirculars()) tabs.push({ key: 'circulars', label: 'Notices / Circulars', count: this.circulars.value()?.length ?? 0 });
    return tabs;
  });
  protected readonly visible = computed(() =>
    this.scoped()
      .filter((a) => (this.view() === 'pending' ? a.status === 'pending' : a.status !== 'pending'))
      .filter((a) => this.category() === 'all' || a.category === this.category()),
  );

  protected readonly selectedId = linkedSignal(() => this.visible()[0]?.id ?? null);
  protected readonly selected = computed(() => this.scoped().find((a) => a.id === this.selectedId()) ?? null);
  protected readonly note = signal('');
  protected readonly label = (c: string) => CATEGORY_LABEL[c] ?? c;

  protected readonly decide = action((p: { id: string; status: 'approved' | 'rejected'; decisionNote: string }) =>
    this.api.patch<Approval>(`approvals/${p.id}`, { status: p.status, decisionNote: p.decisionNote }),
  );

  protected submit(a: Approval, status: 'approved' | 'rejected'): void {
    if (status === 'rejected' && !this.note().trim()) {
      this.toast.show('Please add a note explaining the rejection.', 'warning');
      return;
    }
    this.decide.run({ id: a.id, status, decisionNote: this.note().trim() }, {
      success: (saved) => {
        this.approvals.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        this.note.set('');
        this.toast.success(`Request ${status}.`);
      },
    });
  }
}
