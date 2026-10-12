import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from '@core/services/loading.service';
import { ToastHost } from '@shared/ui/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main">Skip to main content</a>
    @if (loading.busy()) {
      <div class="progress-bar" role="progressbar" aria-label="Loading"></div>
    }
    <router-outlet />
    <app-toast-host />
  `,
  styles: `
    .progress-bar { position: fixed; inset: 0 0 auto; z-index: 1000; height: 3px; overflow: hidden; background: var(--c-primary-soft); }
    .progress-bar::after { content: ''; position: absolute; inset: 0; width: 40%; background: var(--c-primary); animation: slide 1s var(--ease) infinite; }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
  `,
})
export class App {
  protected readonly loading = inject(LoadingService);
}
