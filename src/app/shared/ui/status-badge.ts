import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { statusLabel, statusTone } from '../utils/status';

@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge--' + tone()">{{ text() }}</span>`,
})
export class StatusBadge {
  readonly value = input<string | null | undefined>(null);
  /** Override the displayed text while keeping the status colour. */
  readonly label = input<string | null>(null);

  protected readonly tone = computed(() => statusTone(this.value()));
  protected readonly text = computed(() => this.label() ?? statusLabel(this.value()));
}
