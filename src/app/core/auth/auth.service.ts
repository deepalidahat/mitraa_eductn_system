import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { StorageService } from '../state/storage.service';
import {
  LoginRequest, LoginResponse, MfaChallenge, Permission, RegisterRequest, Role, Session, User,
  isMfaChallenge, roleHome,
} from '../models';

const SESSION_KEY = 'session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(this.restore());
  private readonly _challenge = signal<(MfaChallenge & { loginAs: Role; remember: boolean }) | null>(null);
  private readonly endHooks: (() => void)[] = [];

  readonly session = this._session.asReadonly();
  readonly challenge = this._challenge.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly role = computed(() => this.user()?.role ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly permissions = computed(() => new Set<Permission>(this.user()?.permissions ?? []));

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', req).pipe(
      tap((res) => {
        if (isMfaChallenge(res)) {
          this._challenge.set({ ...res, loginAs: req.loginAs, remember: req.remember });
        } else {
          this.start(res, req.remember);
        }
      }),
    );
  }

  verifyOtp(code: string): Observable<Session> {
    const challenge = this._challenge();
    return this.api.post<Session>('auth/verify-otp', { challengeId: challenge?.challengeId, code }).pipe(
      tap((session) => this.start(session, challenge?.remember ?? false)),
    );
  }

  resendOtp(): Observable<{ expiresInSec: number }> {
    return this.api.post('auth/resend-otp', { challengeId: this._challenge()?.challengeId });
  }

  cancelChallenge(): void {
    this._challenge.set(null);
  }

  forgotPassword(identifier: string): Observable<{ message: string }> {
    return this.api.post('auth/forgot-password', { identifier });
  }

  register(req: RegisterRequest): Observable<{ message: string }> {
    return this.api.post('auth/register', req);
  }

  can(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  /** Keeps the stored session in sync after a profile update. */
  patchUser(patch: Partial<User>): void {
    const s = this._session();
    if (!s) return;
    const next = { ...s, user: { ...s.user, ...patch } };
    this._session.set(next);
    this.persist(next, this.storage.read<Session>(SESSION_KEY, 'local') !== null);
  }

  homeUrl(): string {
    const role = this.role();
    return role ? roleHome(role) : '/';
  }

  /** Register cleanup for client-side protected data (runs on logout / expiry / account change). */
  onSessionEnd(hook: () => void): void {
    this.endHooks.push(hook);
  }

  logout(reason: 'manual' | 'expired' = 'manual'): void {
    if (this._session()) {
      this.api.post('auth/logout', {}).subscribe({ error: () => undefined });
    }
    this.clear();
    void this.router.navigate(['/select-role'], { queryParams: reason === 'expired' ? { reason } : {} });
  }

  private start(session: Session, remember: boolean): void {
    // A different account signing in must never inherit the previous account's data.
    if (this._session()?.user.id !== session.user.id) this.endHooks.forEach((h) => h());
    this._challenge.set(null);
    this._session.set(session);
    this.persist(session, remember);
  }

  private clear(): void {
    this._session.set(null);
    this._challenge.set(null);
    this.storage.remove(SESSION_KEY);
    this.endHooks.forEach((h) => h());
  }

  private persist(session: Session, remember: boolean): void {
    this.storage.remove(SESSION_KEY);
    this.storage.write(SESSION_KEY, session, remember ? 'local' : 'session');
  }

  private restore(): Session | null {
    const s = this.storage.read<Session>(SESSION_KEY, 'session') ?? this.storage.read<Session>(SESSION_KEY, 'local');
    if (!s || Date.parse(s.expiresAt) <= Date.now()) {
      this.storage.remove(SESSION_KEY);
      return null;
    }
    return s;
  }
}
