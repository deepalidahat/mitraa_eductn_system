import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { Icon, PageHeader } from '@shared/ui';

@Component({
  selector: 'app-help-page',
  imports: [RouterLink, PageHeader, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Help & Support" subtitle="Answers to common questions and ways to reach us." />
      <div class="split">
        <section class="card stack" aria-labelledby="faq">
          <h2 id="faq" class="card__title">Frequently asked questions</h2>
          @for (f of faqs; track f.q) {
            <details class="faq">
              <summary>{{ f.q }}</summary>
              <p class="muted">{{ f.a }}</p>
            </details>
          }
        </section>
        <div class="stack">
          <section class="card stack-sm">
            <h2 class="card__title">Contact support</h2>
            <p class="text-sm"><app-icon name="message" [size]="16" style="display:inline-flex" /> support&#64;mitraa.edu</p>
            <p class="text-sm muted">Mon–Sat, 8:00 AM – 6:00 PM</p>
            @if (canComplain()) {
              <a class="btn" [routerLink]="base() + '/complaints'">Raise a complaint</a>
            }
          </section>
          <section class="card stack-sm">
            <h2 class="card__title">Accessibility</h2>
            <p class="text-sm muted">Use the accessibility button in the top bar to change theme, text size, contrast and motion.
              Every page works with a keyboard: <kbd>Tab</kbd> to move, <kbd>Enter</kbd> to activate, <kbd>Esc</kbd> to close menus.</p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: `
    .faq { padding: var(--sp-3) 0; border-bottom: 1px solid var(--c-border); }
    .faq summary { font-weight: 600; cursor: pointer; }
    .faq p { margin-top: var(--sp-2); }
    kbd { padding: 0 4px; border: 1px solid var(--c-border-strong); border-radius: 4px; font-size: var(--fs-xs); }
  `,
})
export class HelpPage {
  private readonly auth = inject(AuthService);
  protected readonly base = computed(() => this.auth.homeUrl());
  protected readonly canComplain = computed(() => this.auth.permissions().has('complaint:create'));
  protected readonly faqs = [
    { q: 'I forgot my password. What should I do?', a: 'Use "Forgot Password?" on the login screen. Reset instructions are sent to your registered email.' },
    { q: 'Why can\'t I see exam results?', a: 'Results appear only after they have been approved and released by the school.' },
    { q: 'Can I resubmit an assignment?', a: 'Only when your teacher has allowed resubmission for that assignment. The option appears on the assignment page.' },
    { q: 'How do I switch between my children? (Parents)', a: 'Use the "Viewing child" selector in the top bar. Every page updates to the selected child.' },
    { q: 'Why was I signed out?', a: 'For your security, sessions end after a period of inactivity. Sign in again to continue.' },
  ];
}
