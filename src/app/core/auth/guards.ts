import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Permission, Role, roleFromPath } from '../models';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from './auth.service';

/** Protected areas: signed-in users only, remembering where they were heading. */
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/select-role'], { queryParams: { returnUrl } });
};

/** Public auth pages: already signed-in users go straight to their dashboard. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).parseUrl(auth.homeUrl()) : true;
};

/** Role area guard: the URL prefix must match the signed-in user's role. */
export const roleGuard = (role: Role): CanMatchFn => () => {
  const auth = inject(AuthService);
  if (auth.role() === role) return true;
  return inject(Router).createUrlTree(['/access-denied']);
};

/** Action-level guard for pages that require a specific permission. */
export const permissionGuard = (permission: Permission): CanActivateFn => () => {
  if (inject(AuthService).can(permission)) return true;
  return inject(Router).createUrlTree(['/access-denied']);
};

/** Phase 2 features stay unreachable until the flag is switched on. */
export const phase2Guard: CanMatchFn = () => {
  if (inject(AppConfigService).config().phase2Enabled) return true;
  return inject(Router).createUrlTree(['/access-denied'], { queryParams: { reason: 'phase2' } });
};

/** Login needs a valid user type in the URL (/login/:role). */
export const loginContextGuard: CanActivateFn = (route) => {
  const meta = roleFromPath(route.paramMap.get('role'));
  return meta ? true : inject(Router).createUrlTree(['/select-role']);
};

/** OTP page is only reachable with a pending MFA challenge. */
export const otpGuard: CanActivateFn = () => {
  if (inject(AuthService).challenge()) return true;
  return inject(Router).createUrlTree(['/select-role']);
};

/** Registration page only when registration is open. */
export const registrationGuard: CanActivateFn = () => {
  if (inject(AppConfigService).config().registrationEnabled) return true;
  return inject(Router).createUrlTree(['/']);
};
