import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatItem } from '@core/models';
import { Icon } from './icon/icon';

@Component({
  selector: 'app-stat-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card stat" [attr.data-tone]="stat().tone ?? 'info'">
      @if (stat().icon) {
        <span class="ico"><app-icon [name]="stat().icon!" /></span>
      }
      <div>
        <p class="label">{{ stat().label }}</p>
        <p class="value">{{ stat().value }}</p>
        @if (stat().hint) {
          <p class="hint">{{ stat().hint }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .stat { display: flex; gap: var(--sp-4); align-items: flex-start; height: 100%; padding: var(--sp-4) var(--sp-5); }
    .ico { display: grid; place-items: center; width: 42px; height: 42px; border-radius: var(--radius-md); background: var(--tone-soft); color: var(--tone); flex: none; }
    .label { font-size: var(--fs-sm); color: var(--c-text-muted); font-weight: 600; }
    .value { font-size: var(--fs-xl); font-weight: 800; letter-spacing: -0.02em; line-height: 1.3; }
    .hint { font-size: var(--fs-xs); color: var(--c-text-subtle); }
    [data-tone='success'] { --tone: var(--c-success); --tone-soft: var(--c-success-soft); }
    [data-tone='warning'] { --tone: var(--c-warning); --tone-soft: var(--c-warning-soft); }
    [data-tone='danger'] { --tone: var(--c-danger); --tone-soft: var(--c-danger-soft); }
    [data-tone='info'], [data-tone='neutral'] { --tone: var(--c-info); --tone-soft: var(--c-info-soft); }
    [data-tone='accent'] { --tone: var(--c-role); --tone-soft: var(--c-role-soft); }
  `,
})
export class StatCard {
  readonly stat = input.required<StatItem>();
}
