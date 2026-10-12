import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Row, TableColumn } from '@core/models';
import { StatusBadge } from './status-badge';

/**
 * Accessible data table. On narrow screens rows collapse into labelled cards,
 * so every column stays readable on mobile without horizontal scrolling.
 */
@Component({
  selector: 'app-data-table',
  imports: [StatusBadge, DatePipe, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table class="table">
        @if (caption()) {
          <caption class="sr-only">{{ caption() }}</caption>
        }
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th scope="col">{{ col.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr [class.is-clickable]="clickable()" [attr.tabindex]="clickable() ? 0 : null"
              (click)="clickable() && rowClick.emit(row)" (keydown.enter)="clickable() && rowClick.emit(row)">
              @for (col of columns(); track col.key) {
                @let v = row[col.key];
                <td [attr.data-label]="col.label">
                  @switch (col.type) {
                    @case ('percent') { {{ v }}% }
                    @case ('currency') { {{ asNumber(v) | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN' }} }
                    @case ('badge') { <app-status [value]="asString(v)" /> }
                    @case ('date') { {{ asString(v) | date: 'mediumDate' }} }
                    @case ('datetime') { {{ asString(v) | date: 'medium' }} }
                    @default { {{ v ?? '—' }} }
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr><td [attr.colspan]="columns().length" class="empty">No records to show.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .empty { text-align: center; color: var(--c-text-muted); padding: var(--sp-6); }
    @media (max-width: 640px) {
      .table-wrap { border: 0; background: transparent; }
      thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      table, tbody, tr, td { display: block; width: 100%; }
      tr { margin-bottom: var(--sp-3); border: 1px solid var(--c-border); border-radius: var(--radius-lg); background: var(--c-surface); padding: var(--sp-2) var(--sp-3); }
      td { display: flex; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-2) 0 !important; border-bottom: 1px dashed var(--c-border) !important; text-align: right !important; }
      td:last-child { border-bottom: 0 !important; }
      td::before { content: attr(data-label); font-weight: 600; color: var(--c-text-muted); text-align: left; }
      td.empty::before { content: none; }
    }
  `,
})
export class DataTable {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<Row[]>();
  readonly caption = input<string | null>(null);
  readonly clickable = input(false);
  readonly rowClick = output<Row>();

  protected asNumber = (v: unknown): number => Number(v ?? 0);
  protected asString = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
}
