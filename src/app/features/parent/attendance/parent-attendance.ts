import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/http/api.service';
import { AttendanceSheet } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { loader } from '@core/state/loader';
import { LoadState, PageHeader, StatCard, StatusBadge } from '@shared/ui';

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/** Parent → Attendance: View Attendance (read-only) for the selected child. */
@Component({
  selector: 'app-parent-attendance',
  imports: [FormsModule, DatePipe, PageHeader, LoadState, StatCard, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Attendance" [subtitle]="'Attendance records for ' + (ctx.activeChild()?.name ?? 'your child') + '.'" />
      <div class="card form-grid">
        <label class="field"><span class="field__label">From</span><input type="date" class="input" [ngModel]="from()" (ngModelChange)="from.set($event)" [max]="to()" /></label>
        <label class="field"><span class="field__label">To</span><input type="date" class="input" [ngModel]="to()" (ngModelChange)="to.set($event)" [min]="from()" /></label>
      </div>
      <app-load-state [loader]="sheets" emptyTitle="No attendance recorded in this period" />
      @if (sheets.value()?.length) {
        <div class="grid-stats">@for (s of summary(); track s.label) { <app-stat-card [stat]="s" /> }</div>
        <div class="table-wrap">
          <table class="table">
            <caption class="sr-only">Attendance records</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Session</th><th scope="col">Status</th></tr></thead>
            <tbody>
              @for (r of records(); track r.id) {
                <tr><td>{{ r.date | date: 'EEE, d MMM y' }}</td><td>{{ r.session }}</td><td><app-status [value]="r.status" /></td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ParentAttendance {
  private readonly api = inject(ApiService);
  protected readonly ctx = inject(ContextService);

  protected readonly from = signal(daysAgo(30));
  protected readonly to = signal(daysAgo(0));

  protected readonly sheets = loader(
    () => {
      const c = this.ctx.activeChild();
      return c ? { classId: c.classId, date_gte: this.from(), date_lte: this.to(), _sort: 'date', _order: 'desc' } : null;
    },
    (p) => this.api.list<AttendanceSheet>('attendance', p),
  );

  protected readonly records = computed(() => {
    const id = this.ctx.activeChildId();
    return (this.sheets.value() ?? []).flatMap((s) => s.records.filter((r) => r.studentId === id).map((r) => ({ id: s.id, date: s.date, session: s.session, status: r.status })));
  });

  protected readonly summary = computed(() => {
    const r = this.records();
    const present = r.filter((x) => x.status === 'present').length;
    const late = r.filter((x) => x.status === 'late').length;
    const pct = r.length ? Math.round(((present + late) / r.length) * 100) : 0;
    return [
      { label: 'Attendance', value: `${pct}%`, tone: (pct >= 90 ? 'success' : 'warning') as 'success' | 'warning', icon: 'check-square' },
      { label: 'Present', value: String(present), tone: 'success' as const, icon: 'check' },
      { label: 'Absent', value: String(r.filter((x) => x.status === 'absent').length), tone: 'danger' as const, icon: 'x' },
      { label: 'Late', value: String(late), tone: 'warning' as const, icon: 'clock' },
    ];
  });
}
