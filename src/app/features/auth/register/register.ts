import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { RegisterRequest } from '@core/models';
import { action } from '@core/state/loader';
import { Icon } from '@shared/ui';

/** Sign Up / Register - only reachable when registration is enabled (registrationGuard). */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../auth-card.scss',
  template: `
    <section class="auth-card auth-card--wide" aria-labelledby="reg-title">
      <header class="auth-head">
        <span class="icon-tile"><app-icon name="user" [size]="26" /></span>
        <h1 id="reg-title">Sign Up / Register</h1>
        <p class="muted text-sm">Your school verifies every registration before the account is activated.</p>
      </header>

      @if (done(); as msg) {
        <div class="alert alert--success" role="status"><app-icon name="check-circle" [size]="18" /> {{ msg }}</div>
        <a routerLink="/" class="btn btn--primary btn--block">Back to welcome</a>
      } @else {
        @if (save.error(); as err) {
          <div class="alert alert--danger" role="alert">{{ err.message }}</div>
        }
        <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <fieldset class="field span-2" style="border:0;padding:0;margin:0">
            <legend class="field__label">I am a</legend>
            <div class="chip-group">
              <label class="chip" [class.is-active]="form.value.role === 'parent'"><input type="radio" class="sr-only" formControlName="role" value="parent" /> Parent / Guardian</label>
              <label class="chip" [class.is-active]="form.value.role === 'student'"><input type="radio" class="sr-only" formControlName="role" value="student" /> Student</label>
            </div>
          </fieldset>
          <div class="field span-2">
            <label for="r-name">Full name</label>
            <input id="r-name" class="input" formControlName="name" autocomplete="name" />
            @if (err('name')) { <span class="field__error">Please enter your full name.</span> }
          </div>
          <div class="field">
            <label for="r-email">Email</label>
            <input id="r-email" type="email" class="input" formControlName="email" autocomplete="email" />
            @if (err('email')) { <span class="field__error">Enter a valid email address.</span> }
          </div>
          <div class="field">
            <label for="r-phone">Mobile number</label>
            <input id="r-phone" type="tel" class="input" formControlName="phone" autocomplete="tel" />
            @if (err('phone')) { <span class="field__error">Enter a 10-digit mobile number.</span> }
          </div>
          <div class="field span-2">
            <label for="r-adm">Admission number <span class="muted">(of the student)</span></label>
            <input id="r-adm" class="input" formControlName="admissionNo" />
            <span class="field__hint">Used by the school to link the account to the right student.</span>
          </div>
          <div class="span-2">
            <button type="submit" class="btn btn--primary btn--block" [disabled]="save.pending()">
              {{ save.pending() ? 'Submitting…' : 'Submit registration' }}
            </button>
          </div>
        </form>
      }
      <a routerLink="/select-role" class="foot-link">Already registered? Login</a>
    </section>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  protected readonly done = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    role: ['parent' as RegisterRequest['role'], Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?\d[\d\s-]{9,14}$/)]],
    admissionNo: [''],
  });
  protected readonly save = action((req: RegisterRequest) => this.auth.register(req));

  protected err(name: 'name' | 'email' | 'phone'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.run(this.form.getRawValue(), { success: (r) => this.done.set(r.message) });
  }
}
