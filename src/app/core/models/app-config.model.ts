import { Role } from './role.model';

export interface AppConfig {
  appName: string;
  tagline: string;
  registrationEnabled: boolean;
  otpEnabled: boolean;
  otpLength: number;
  mfaRoles: Role[];
  paymentsEnabled: boolean;
  phase2Enabled: boolean;
  sessionTimeoutMinutes: number;
  languages: { code: string; label: string }[];
}

/** Used until /api/config responds (or if it fails), so the app always renders safely. */
export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'MiTRAA-Edu',
  tagline: 'Connected Education for a Brighter Tomorrow',
  registrationEnabled: false,
  otpEnabled: true,
  otpLength: 6,
  mfaRoles: ['principal', 'management', 'examController'],
  paymentsEnabled: false,
  phase2Enabled: false,
  sessionTimeoutMinutes: 30,
  languages: [{ code: 'en', label: 'English' }],
};
