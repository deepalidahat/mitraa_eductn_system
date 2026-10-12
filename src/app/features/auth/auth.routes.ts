import { Routes } from '@angular/router';
import { guestGuard, loginContextGuard, otpGuard, registrationGuard } from '@core/auth/guards';

/** Entry journey: Welcome → Select User Type → Login → OTP (if enabled) → role dashboard. */
export const AUTH_ROUTES: Routes = [
  { path: '', title: 'Welcome', canActivate: [guestGuard], loadComponent: () => import('./landing/landing').then((m) => m.Landing) },
  { path: 'select-role', title: 'Select User Type', canActivate: [guestGuard], loadComponent: () => import('./role-select/role-select').then((m) => m.RoleSelect) },
  { path: 'login', pathMatch: 'full', redirectTo: 'select-role' },
  { path: 'login/:role', title: 'Login', canActivate: [guestGuard, loginContextGuard], loadComponent: () => import('./login/login').then((m) => m.Login) },
  { path: 'verify', title: 'Two-Factor Authentication', canActivate: [guestGuard, otpGuard], loadComponent: () => import('./otp/otp').then((m) => m.Otp) },
  { path: 'forgot-password', title: 'Forgot Password', canActivate: [guestGuard], loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPassword) },
  { path: 'register', title: 'Sign Up', canActivate: [guestGuard, registrationGuard], loadComponent: () => import('./register/register').then((m) => m.Register) },
];
