import { Role } from './role.model';

export type Permission =
  | 'assignment:submit' | 'assignment:manage'
  | 'exam:attempt' | 'exam:manage' | 'exam:moderate'
  | 'practice:use' | 'message:send' | 'complaint:create' | 'complaint:manage'
  | 'attendance:mark' | 'question:manage' | 'support:manage' | 'parent:communicate'
  | 'payment:make' | 'ptm:book' | 'request:create' | 'notice:ack' | 'notice:publish'
  | 'approval:decide' | 'paper:approve' | 'results:release' | 'student:view-detail'
  | 'report:custom' | 'exam:programme' | 'paper:lock' | 'results:authorize';

export interface User {
  id: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
  userCode: string;
  phone?: string;
  language?: string;
  designation?: string;
  mfaEnabled: boolean;
  permissions: Permission[];
  campusIds: string[];
  /** student */
  studentId?: string;
  classId?: string;
  /** teacher */
  classIds?: string[];
  subjectIds?: string[];
  /** parent */
  childIds?: string[];
}

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  loginAs: Role;
  remember: boolean;
}

export interface MfaChallenge {
  mfaRequired: true;
  challengeId: string;
  otpLength: number;
  destination: string;
  expiresInSec: number;
}

export type LoginResponse = Session | MfaChallenge;

export const isMfaChallenge = (r: LoginResponse): r is MfaChallenge => 'mfaRequired' in r && r.mfaRequired;

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'parent';
  admissionNo?: string;
}
