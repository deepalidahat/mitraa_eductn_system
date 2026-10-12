import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Loader } from '@core/state/loader';
import { Icon } from './icon/icon';

/**
 * Shared loading / error / access-denied / empty states for a Loader.
 * Renders nothing once data is present, so pages render their content alongside it.
 */
@Component({
  selector: 'app-load-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = loader();
    @if (l.loading() && l.value() === undefined) {
      <div class="skeletons" role="status" aria-live="polite">
        <span class="sr-only">Loading…</span>
        @for (i of rows(); track i) {
          <div class="skeleton" [style.height.px]="height()"></div>
        }
      </div>
    } @else if (l.error(); as err) {
      @if (err.status === 403) {
        <div class="state card card--flat" role="alert">
          <app-icon name="lock" [size]="28" />
          <h2>Access denied</h2>
          <p class="muted">{{ err.message }}</p>
        </div>
      } @else {
        <div class="state card card--flat" role="alert">
          <app-icon name="alert" [size]="28" />
          <h2>{{ err.status === 0 ? 'You appear to be offline' : 'Something went wrong' }}</h2>
          <p class="muted">{{ err.message }}</p>
          <button type="button" class="btn" (click)="l.reload()"><app-icon name="refresh" [size]="16" /> Try again</button>
        </div>
      }
    } @else if (isEmpty()) {
      <div class="state card card--flat">
        <img src="assets/images/empty-state.svg" alt="" width="120" height="90" />
        <h2>{{ emptyTitle() }}</h2>
        @if (emptyText()) {
          <p class="muted">{{ emptyText() }}</p>
        }
        <ng-content select="[empty-action]" />
      </div>
    }
  `,
  styles: `
    .skeletons { display: grid; gap: var(--sp-3); }
    .state { display: grid; justify-items: center; gap: var(--sp-2); padding: var(--sp-10) var(--sp-6); text-align: center; color: var(--c-text-muted); }
    .state h2 { font-size: var(--fs-lg); color: var(--c-text); }
    .state p { max-width: 46ch; }
  `,
})
export class LoadState {
  readonly loader = input.required<Loader<unknown>>();
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyText = input<string | null>(null);
  /** Treat as empty even when the value isn't an array (e.g. filtered results). */
  readonly empty = input<boolean | null>(null);
  readonly skeletons = input(3);
  readonly height = input(72);

  protected readonly rows = computed(() => Array.from({ length: this.skeletons() }, (_, i) => i));
  protected readonly isEmpty = computed(() => {
    const l = this.loader();
    if (l.loading() && l.value() === undefined) return false;
    return this.empty() ?? l.empty();
  });
}
