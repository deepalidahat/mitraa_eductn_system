export type Role = 'student' | 'teacher' | 'parent' | 'principal' | 'management' | 'examController';

export interface RoleMeta {
  role: Role;
  label: string;
  /** URL segment of the role's area, e.g. /student/... */
  path: string;
  icon: string;
  homeTitle: string;
  description: string;
  /** Phase 2 roles stay hidden/disabled until the feature flag is switched on. */
  phase2?: boolean;
}

export const ROLES: readonly RoleMeta[] = [
  { role: 'student', label: 'Student', path: 'student', icon: 'graduation', homeTitle: 'Home (Overview)', description: 'Classes, assignments, exams and PracticePod' },
  { role: 'teacher', label: 'Teacher / Staff', path: 'teacher', icon: 'presentation', homeTitle: 'Home (Overview)', description: 'Attendance, assignments, exams and student support' },
  { role: 'parent', label: 'Parent / Guardian', path: 'parent', icon: 'users', homeTitle: 'Home (Child Overview)', description: "Your child's progress, PTMs, fees and requests" },
  { role: 'principal', label: 'Principal / HOD', path: 'principal', icon: 'briefcase', homeTitle: 'Home (Academic Overview)', description: 'Academic coverage, staff, approvals and notices' },
  { role: 'management', label: 'Management / Trustee', path: 'management', icon: 'chart', homeTitle: 'Home (Institution Overview)', description: 'Campus metrics, reports, finance and compliance' },
  { role: 'examController', label: 'Exam Controller', path: 'exam-controller', icon: 'layers', homeTitle: 'Home (Exam Overview)', description: 'Exam programmes, papers, centres and results', phase2: true },
];

const BY_ROLE = new Map(ROLES.map((r) => [r.role, r]));
const BY_PATH = new Map(ROLES.map((r) => [r.path, r]));

export const roleMeta = (role: Role): RoleMeta => BY_ROLE.get(role)!;
export const roleFromPath = (path: string | null | undefined): RoleMeta | undefined => (path ? BY_PATH.get(path) : undefined);
export const roleHome = (role: Role): string => `/${roleMeta(role).path}`;
