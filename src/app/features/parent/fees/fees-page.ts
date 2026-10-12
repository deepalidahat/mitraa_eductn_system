import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { Fee, Payment } from '@core/models';
import { AppConfigService } from '@core/services/app-config.service';
import { ContextService } from '@core/services/context.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { HasPermission } from '@shared/directives/has-permission';
import { Icon, LoadState, PageHeader, StatCard, StatusBadge } from '@shared/ui';

/** Parent → Fees & Payments: View Fee Details, Make Payment (if enabled). */
@Component({
  selector: 'app-fees-page',
  imports: [FormsModule, CurrencyPipe, DatePipe, PageHeader, LoadState, StatCard, StatusBadge, Icon, HasPermission],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fees-page.html',
})
export class FeesPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly ctx = inject(ContextService);
  protected readonly config = inject(AppConfigService).config;

  protected readonly data = loader(
    () => this.ctx.activeChildId(),
    (studentId) => forkJoin({
      fees: this.api.list<Fee>('fees', { studentId, _sort: 'dueDate' }),
      payments: this.api.list<Payment>('payments', { studentId, _sort: 'paidAt', _order: 'desc' }),
    }),
  );

  protected readonly totals = computed(() => {
    const fees = this.data.value()?.fees ?? [];
    const billed = fees.reduce((s, f) => s + f.amount, 0);
    const paid = fees.reduce((s, f) => s + f.paid, 0);
    const overdue = fees.filter((f) => f.status === 'overdue').reduce((s, f) => s + f.amount - f.paid, 0);
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    return [
      { label: 'Total billed', value: fmt(billed), tone: 'info' as const, icon: 'file' },
      { label: 'Paid', value: fmt(paid), tone: 'success' as const, icon: 'check-circle' },
      { label: 'Balance due', value: fmt(billed - paid), tone: (billed - paid ? 'warning' : 'success') as 'warning' | 'success', icon: 'wallet' },
      { label: 'Overdue', value: fmt(overdue), tone: (overdue ? 'danger' : 'success') as 'danger' | 'success', icon: 'alert' },
    ];
  });

  protected readonly paying = signal<Fee | null>(null);
  protected readonly amount = signal(0);
  protected readonly method = signal('UPI');
  protected readonly lastPayment = signal<Payment | null>(null);
  protected readonly pay = action((body: object) => this.api.post<Payment>('payments', body));

  protected start(f: Fee): void {
    this.paying.set(f);
    this.amount.set(f.amount - f.paid);
    this.lastPayment.set(null);
    this.pay.clearError();
  }

  protected confirm(): void {
    const f = this.paying();
    if (!f) return;
    this.pay.run({ feeId: f.id, amount: this.amount(), method: this.method() }, {
      success: (p) => {
        this.lastPayment.set(p);
        this.paying.set(null);
        this.toast.success('Payment successful.');
        this.data.reload(); // show the balances the backend actually saved
      },
    });
  }
}
