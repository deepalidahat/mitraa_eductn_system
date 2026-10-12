import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';
import { Icon } from './icon/icon';

const ICON_BY_TONE: Partial<Record<string, string>> = { success: 'check-circle', danger: 'alert', warning: 'clock', info: 'info' };

@Component({
  selector: 'app-toast-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" role="region" aria-label="Notifications" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [attr.data-tone]="t.tone" [attr.role]="t.tone === 'danger' ? 'alert' : 'status'">
          <app-icon [name]="icons[t.tone] ?? 'info'" />
          <p>{{ t.message }}</p>
          <button type="button" class="btn btn--ghost btn--icon" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .host { position: fixed; right: var(--sp-4); bottom: var(--sp-4); z-index: 900; display: grid; gap: var(--sp-2); width: min(420px, calc(100vw - 2rem)); }
    .toast { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-4); border-radius: var(--radius-md); background: var(--c-brand); color: #fff; box-shadow: var(--shadow-lg); animation: in 220ms var(--ease); font-size: var(--fs-sm); }
    .toast p { flex: 1; }
    .toast .btn { color: inherit; }
    [data-tone='success'] { background: #0f5c39; }
    [data-tone='danger'] { background: #8f1b2a; }
    [data-tone='warning'] { background: #7a4300; }
    @keyframes in { from { opacity: 0; transform: translateY(8px); } }
  `,
})
export class ToastHost {
  protected readonly toast = inject(ToastService);
  protected readonly icons = ICON_BY_TONE;
}
