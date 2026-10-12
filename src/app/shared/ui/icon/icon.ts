import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS } from './icons';

/** Decorative by default (aria-hidden). Pass `label` when the icon carries meaning on its own. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-icon', '[attr.aria-hidden]': 'label() ? null : true', '[attr.role]': 'label() ? "img" : null', '[attr.aria-label]': 'label()' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `:host { display: inline-flex; flex: none; line-height: 0; }`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly stroke = input(2);
  readonly label = input<string | null>(null);

  protected readonly path = computed(() => ICONS[this.name()] ?? ICONS['info']);
}
