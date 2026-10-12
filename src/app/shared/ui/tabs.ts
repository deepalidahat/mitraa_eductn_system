import { ChangeDetectionStrategy, Component, ElementRef, inject, input, model } from '@angular/core';

export interface TabItem {
  key: string;
  label: string;
  count?: number | null;
}

/** WAI-ARIA tablist with roving focus (Arrow keys / Home / End). Panels are rendered by the page. */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="tablist" [attr.aria-label]="label()" (keydown)="onKey($event)">
      @for (t of tabs(); track t.key) {
        <button type="button" role="tab" class="tab" [id]="'tab-' + t.key"
          [attr.aria-selected]="active() === t.key" [attr.tabindex]="active() === t.key ? 0 : -1"
          (click)="active.set(t.key)">
          {{ t.label }}
          @if (t.count !== undefined && t.count !== null) {
            <span class="count">{{ t.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .tabs { display: flex; gap: var(--sp-1); overflow-x: auto; border-bottom: 1px solid var(--c-border); scrollbar-width: thin; }
    .tab { display: inline-flex; align-items: center; gap: var(--sp-2); min-height: 44px; padding: 0 var(--sp-4); border: 0; border-bottom: 3px solid transparent; background: none; color: var(--c-text-muted); font-weight: 600; font-size: var(--fs-sm); white-space: nowrap; cursor: pointer; }
    .tab:hover { color: var(--c-text); }
    .tab[aria-selected='true'] { color: var(--c-role); border-bottom-color: var(--c-role); }
    .count { padding: 0 var(--sp-2); border-radius: var(--radius-pill); background: var(--c-surface-3); color: var(--c-text); font-size: var(--fs-xs); }
  `,
})
export class Tabs {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tabs = input.required<TabItem[]>();
  readonly active = model.required<string>();
  readonly label = input('Sections');

  protected onKey(e: KeyboardEvent): void {
    const keys = this.tabs().map((t) => t.key);
    const i = keys.indexOf(this.active());
    const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: keys.length - 1 };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const key = keys[(next + keys.length) % keys.length];
    this.active.set(key);
    this.host.nativeElement.querySelector<HTMLElement>(`#tab-${key}`)?.focus();
  }
}
