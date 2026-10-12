import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChildren } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap, takeWhile, timer } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { roleHome, roleMeta } from '@core/models';
import { action } from '@core/state/loader';
import { Icon } from '@shared/ui';
import { environment } from '@env/environment';

/** Step 4 - Two-Factor Authentication (only reached when the backend asks for it). */
@Component({
  selector: 'app-otp',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './otp.html',
  styleUrls: ['../auth-card.scss', './otp.scss'],
})
export class Otp {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  readonly returnUrl = input<string>();

  protected readonly challenge = this.auth.challenge;
  protected readonly meta = computed(() => roleMeta(this.challenge()?.loginAs ?? 'principal'));
  protected readonly length = computed(() => this.challenge()?.otpLength ?? 6);
  protected readonly digits = signal<string[]>([]);
  protected readonly code = computed(() => this.digits().join(''));
  protected readonly complete = computed(() => this.code().length === this.length() && /^\d+$/.test(this.code()));
  protected readonly isDev = !environment.production;

  /** Restarts whenever a (re)sent code changes the expiry. */
  private readonly expiresAt = signal(Date.now() + (this.challenge()?.expiresInSec ?? 300) * 1000);
  protected readonly secondsLeft = toSignal(
    toObservable(this.expiresAt).pipe(
      switchMap((at) =>
        timer(0, 1000).pipe(
          map(() => Math.max(0, Math.round((at - Date.now()) / 1000))),
          takeWhile((s) => s > 0, true),
        ),
      ),
    ),
    { initialValue: 300 },
  );
  protected readonly countdown = computed(() => {
    const s = this.secondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  protected readonly verify = action((code: string) => this.auth.verifyOtp(code));
  protected readonly resend = action(() => this.auth.resendOtp());
  protected readonly resent = signal(false);

  protected slots(): number[] {
    return Array.from({ length: this.length() }, (_, i) => i);
  }

  protected onInput(i: number, e: Event): void {
    const el = e.target as HTMLInputElement;
    const value = el.value.replace(/\D/g, '');
    if (value.length > 1) {
      this.fill(value, i);
      return;
    }
    this.setDigit(i, value);
    el.value = value;
    if (value && i < this.length() - 1) this.focus(i + 1);
    if (this.complete()) this.submit();
  }

  protected onKeydown(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !this.digits()[i] && i > 0) {
      this.setDigit(i - 1, '');
      this.focus(i - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) this.focus(i - 1);
    else if (e.key === 'ArrowRight' && i < this.length() - 1) this.focus(i + 1);
  }

  protected onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (!text) return;
    e.preventDefault();
    this.fill(text, 0);
  }

  protected submit(): void {
    if (!this.complete() || this.secondsLeft() === 0) return;
    this.verify.run(this.code(), {
      success: (session) => {
        const ret = this.returnUrl();
        const home = roleHome(session.user.role);
        void this.router.navigateByUrl(ret && ret.startsWith(home) && !ret.startsWith('//') ? ret : home);
      },
      failure: (err) => {
        this.digits.set([]);
        this.boxes().forEach((b) => (b.nativeElement.value = ''));
        this.focus(0);
        // Expired / locked challenges cannot be retried: start sign-in again.
        if (err.status === 410 || err.status === 429) this.auth.cancelChallenge();
      },
    });
  }

  protected resendCode(): void {
    this.resend.run(undefined, {
      success: (res) => {
        this.expiresAt.set(Date.now() + res.expiresInSec * 1000);
        this.resent.set(true);
      },
    });
  }

  protected cancel(): void {
    this.auth.cancelChallenge();
    void this.router.navigate(['/login', this.meta().path]);
  }

  private fill(value: string, from: number): void {
    const next = [...this.digits()];
    value.split('').slice(0, this.length() - from).forEach((d, k) => (next[from + k] = d));
    this.digits.set(next);
    this.boxes().forEach((b, idx) => (b.nativeElement.value = next[idx] ?? ''));
    this.focus(Math.min(from + value.length, this.length() - 1));
    if (this.complete()) this.submit();
  }

  private setDigit(i: number, d: string): void {
    this.digits.update((list) => {
      const next = [...list];
      next[i] = d;
      return next;
    });
  }

  private focus(i: number): void {
    this.boxes()[i]?.nativeElement.focus();
  }
}
