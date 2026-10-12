import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { Insight, InsightSection, Row } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { BarChart, DataTable, Icon, LoadState, PageHeader, StatCard, Tabs } from '@shared/ui';

/**
 * Generic analytics / report page driven by `/api/insights/:id`.
 * Each flowchart sub-function becomes a tab (section). Used by principal, management,
 * teacher reports and the Phase 2 exam-controller screens.
 *
 * Route usage: { path: 'staff', component: InsightPage, data: { insight: 'principal-staff' } }
 */
@Component({
  selector: 'app-insight-page',
  imports: [PageHeader, StatCard, Tabs, DataTable, BarChart, LoadState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data.value(); as d) {
        <app-page-header [heading]="d.title" [subtitle]="d.subtitle">
          @if (activeSection(); as s) {
            <button type="button" class="btn" (click)="exportCsv(s)"><app-icon name="download" [size]="16" /> Export CSV</button>
          }
          <button type="button" class="btn" (click)="print()"><app-icon name="printer" [size]="16" /> Print</button>
        </app-page-header>

        @if (scopeNote()) {
          <p class="alert" role="note"><app-icon name="filter" [size]="16" /> {{ scopeNote() }}</p>
        }

        @if (d.stats.length) {
          <div class="grid-stats">
            @for (s of d.stats; track s.label) {
              <app-stat-card [stat]="s" />
            }
          </div>
        }

        @if (sections().length > 1) {
          <app-tabs [tabs]="tabs()" [(active)]="active" [label]="d.title + ' sections'" />
        }

        @if (activeSection(); as s) {
          <section class="card" role="tabpanel" [attr.aria-labelledby]="'tab-' + s.key">
            <div class="card__header">
              <h2 class="card__title">{{ s.title }}</h2>
              <span class="text-xs muted">{{ s.rows.length }} record(s)</span>
            </div>
            @if (s.description) {
              <p class="muted text-sm">{{ s.description }}</p>
            }
            @if (!s.rows.length) {
              <p class="muted text-sm">No data for this view yet.</p>
            } @else if (s.type === 'bars') {
              <app-bar-chart [data]="bars(s)" [unit]="s.unit ?? ''" [max]="s.max ?? null" [title]="s.title" />
            } @else {
              <app-data-table [columns]="s.columns ?? []" [rows]="s.rows" [caption]="s.title" />
            }
          </section>
        }
      } @else {
        <app-page-header heading="Loading report…" />
      }
      <app-load-state [loader]="data" [skeletons]="3" [height]="120" />
    </div>
  `,
})
export class InsightPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(ContextService);
  private readonly lookup = inject(LookupService);

  /** Bound from route data. */
  readonly insight = input.required<string>();

  protected readonly data = loader(() => this.insight(), (id) => this.api.get<Insight>(`insights/${id}`));

  /** Rows tagged with a campus are limited to the user's active, authorized campus scope. */
  protected readonly sections = computed<InsightSection[]>(() => {
    const d = this.data.value();
    if (!d) return [];
    if (!d.campusScoped) return d.sections;
    const scope = new Set(this.ctx.campusScope());
    return d.sections.map((s) => ({
      ...s,
      rows: s.rows.filter((r) => typeof r['campusId'] !== 'string' || scope.has(r['campusId'] as string)),
    }));
  });

  protected readonly tabs = computed(() => this.sections().map((s) => ({ key: s.key, label: s.title })));
  protected readonly active = linkedSignal(() => this.sections()[0]?.key ?? '');
  protected readonly activeSection = computed(() => this.sections().find((s) => s.key === this.active()) ?? null);

  protected readonly scopeNote = computed(() => {
    if (!this.data.value()?.campusScoped || this.auth.role() !== 'management') return null;
    const names = this.ctx.campusScope().map((c) => this.lookup.campusName(c));
    return `Showing: ${names.join(', ')}. Change the campus scope from the top bar.`;
  });

  protected bars(s: InsightSection): { label: string; value: number }[] {
    return s.rows.map((r: Row) => ({ label: String(r['label']), value: Number(r['value']) }));
  }

  protected exportCsv(s: InsightSection): void {
    const cols = s.columns ?? [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => esc(c.label)).join(','), ...s.rows.map((r) => cols.map((c) => esc(r[c.key])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${this.insight()}-${s.key}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  protected print(): void {
    window.print();
  }
}
