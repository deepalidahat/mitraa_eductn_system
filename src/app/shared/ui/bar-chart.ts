import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Lightweight CSS bar chart. Each bar is also plain text, and a visually hidden table gives
 * screen-reader users the same data (text alternative for charts).
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      @if (title()) {
        <figcaption class="sr-only">{{ title() }}</figcaption>
      }
      <ul class="bars" aria-hidden="true">
        @for (d of data(); track d.label) {
          <li>
            <span class="label">{{ d.label }}</span>
            <span class="track"><span class="fill" [style.width.%]="(d.value / scale()) * 100"></span></span>
            <span class="value">{{ d.value }}{{ unit() }}</span>
          </li>
        }
      </ul>
      <table class="sr-only">
        <caption>{{ title() || 'Chart data' }}</caption>
        <tbody>
          @for (d of data(); track d.label) {
            <tr><th scope="row">{{ d.label }}</th><td>{{ d.value }}{{ unit() }}</td></tr>
          }
        </tbody>
      </table>
    </figure>
  `,
  styles: `
    figure { margin: 0; }
    .bars { display: grid; gap: var(--sp-3); margin: 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: minmax(110px, 1fr) 2.2fr auto; align-items: center; gap: var(--sp-3); font-size: var(--fs-sm); }
    .label { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .track { height: 12px; border-radius: var(--radius-pill); background: var(--c-surface-3); overflow: hidden; }
    .fill { display: block; height: 100%; border-radius: inherit; background: var(--c-role); transition: width 500ms var(--ease); }
    .value { min-width: 4.5ch; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
    @media (max-width: 480px) { li { grid-template-columns: 1fr auto; } .track { grid-column: 1 / -1; grid-row: 2; } }
  `,
})
export class BarChart {
  readonly data = input.required<BarDatum[]>();
  readonly unit = input('');
  readonly max = input<number | null>(null);
  readonly title = input<string | null>(null);

  /** Percentages scale to 100; other units scale to the largest value. */
  protected readonly scale = computed(() => this.max() ?? Math.max(this.unit() === '%' ? 100 : 1, ...this.data().map((d) => d.value)));
}
