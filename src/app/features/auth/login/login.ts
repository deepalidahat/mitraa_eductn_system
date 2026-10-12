import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { isMfaChallenge, roleFromPath, roleHome } from '@core/models';
import { action } from '@core/state/loader';
import { Icon } from '@shared/ui';
import { environment } from '@env/environment';

const DEMO_ACCOUNTS: Record<string, string> = {
  student: 'student@mitraa.edu',
  teacher: 'teacher@mitraa.edu',
  parent: 'parent@mitraa.edu',
  principal: 'principal@mitraa.edu',
  management: 'trustee@mitraa.edu',
  examController: 'exam@mitraa.edu',
};

/** Step 3 - Login. The chosen user type comes from the URL: /login/:role */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: '../auth-card.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Route param (component input binding). */
  readonly role = input.required<string>();
  readonly returnUrl = input<string>();

  protected readonly meta = computed(() => roleFromPath(this.role())!);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly isDev = !environment.production;
  protected readonly demoAccount = computed(() => DEMO_ACCOUNTS[this.meta().role]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  protected readonly login = action((req: Parameters<AuthService['login']>[0]) => this.auth.login(req));

  protected submit(): void {
    this.submitted.set(true);
    this.login.clearError();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { identifier, password, remember } = this.form.getRawValue();
    this.login.run(
      { identifier: identifier.trim(), password, remember, loginAs: this.meta().role },
      {
        success: (res) => {
          if (isMfaChallenge(res)) {
            void this.router.navigate(['/verify'], { queryParams: this.safeReturn() ? { returnUrl: this.safeReturn() } : {} });
          } else {
            void this.router.navigateByUrl(this.safeReturn() ?? roleHome(res.user.role));
          }
        },
      },
    );
  }

  protected fillDemo(): void {
    this.form.patchValue({ identifier: this.demoAccount(), password: 'Password@123' });
  }

  protected invalid(name: 'identifier' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  /** Only same-app paths inside the chosen role's area are honoured (no open redirects). */
  private safeReturn(): string | null {
    const url = this.returnUrl();
    const prefix = `/${this.meta().path}`;
    return url && url.startsWith(prefix) && !url.startsWith('//') ? url : null;
  }
}
