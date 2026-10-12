import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon/icon';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (backLink()) {
      <a class="back" [routerLink]="backLink()"><app-icon name="arrow-left" [size]="16" /> {{ backLabel() }}</a>
    }
    <div class="row">
      <div class="text">
        <h1>{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    :host { display: grid; gap: var(--sp-2); }
    .back { display: inline-flex; align-items: center; gap: var(--sp-1); width: fit-content; font-size: var(--fs-sm); font-weight: 600; text-decoration: none; }
    .row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--sp-4); }
    .text { display: grid; gap: var(--sp-1); min-width: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
    .actions:empty { display: none; }
  `,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly backLink = input<string | unknown[] | null>(null);
  readonly backLabel = input('Back');
}
