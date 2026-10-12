import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { action } from '@core/state/loader';
import { Icon } from '@shared/ui';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../auth-card.scss',
  template: `
    <section class="auth-card" aria-labelledby="fp-title">
      <header class="auth-head">
        <span class="icon-tile"><app-icon name="lock" [size]="26" /></span>
        <h1 id="fp-title">Forgot Password?</h1>
        <p class="muted text-sm">Enter your registered email or user ID and we'll send reset instructions.</p>
      </header>

      @if (message(); as msg) {
        <div class="alert alert--success" role="status"><app-icon name="check-circle" [size]="18" /> {{ msg }}</div>
      } @else {
        @if (send.error(); as err) {
          <div class="alert alert--danger" role="alert">{{ err.message }}</div>
        }
        <form class="stack" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="fp-id">Email / User ID</label>
            <input id="fp-id" class="input" formControlName="identifier" autocomplete="username"
              [attr.aria-invalid]="form.controls.identifier.invalid && form.controls.identifier.touched" />
            @if (form.controls.identifier.invalid && form.controls.identifier.touched) {
              <span class="field__error">This field is required.</span>
            }
          </div>
          <button type="submit" class="btn btn--primary btn--block" [disabled]="send.pending()">
            {{ send.pending() ? 'Sending…' : 'Send reset instructions' }}
          </button>
        </form>
      }
      <a routerLink="/select-role" class="foot-link"><app-icon name="arrow-left" [size]="16" /> Back to login</a>
    </section>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  protected readonly message = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({ identifier: ['', Validators.required] });
  protected readonly send = action((id: string) => this.auth.forgotPassword(id));

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.send.run(this.form.getRawValue().identifier.trim(), { success: (r) => this.message.set(r.message) });
  }
}
