import { Role } from '../models';

export interface NavItem {
  label: string;
  /** Path relative to the role area ('' = home). */
  path: string;
  icon: string;
  /** Short description used on dashboard shortcuts and search. */
  hint?: string;
}

/**
 * Role menus exactly as in the flowchart, plus the proposed shared complaint entry point
 * for students, parents and staff.
 */
export const NAVIGATION: Record<Role, NavItem[]> = {
  student: [
    { label: 'Home (Overview)', path: '', icon: 'home' },
    { label: 'My Classes & Timetable', path: 'classes', icon: 'calendar', hint: 'Your class and weekly timetable' },
    { label: 'Assignments', path: 'assignments', icon: 'clipboard', hint: 'View, submit, feedback, resubmit' },
    { label: 'Examinations', path: 'examinations', icon: 'exam', hint: 'Schedule, attempt, results' },
    { label: 'PracticePod', path: 'practice', icon: 'target', hint: 'Generate practice papers & solutions' },
    { label: 'My Performance', path: 'performance', icon: 'trend', hint: 'Progress, analytics, learning gaps' },
    { label: 'Notices', path: 'notices', icon: 'megaphone' },
    { label: 'Messages (Academic Doubt)', path: 'messages', icon: 'message', hint: 'Ask your teachers' },
    { label: 'PTM / Meetings (View)', path: 'ptm', icon: 'users' },
    { label: 'Downloads (Study Material)', path: 'downloads', icon: 'download' },
    { label: 'Complaints', path: 'complaints', icon: 'alert' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
  teacher: [
    { label: 'Home (Overview)', path: '', icon: 'home' },
    { label: 'My Classes & Timetable', path: 'classes', icon: 'calendar', hint: 'Assigned classes and timetable' },
    { label: 'Attendance', path: 'attendance', icon: 'check-square', hint: 'Mark attendance, view records' },
    { label: 'Assignment Engine', path: 'assignments', icon: 'clipboard', hint: 'Create, publish, evaluate' },
    { label: 'Question Bank', path: 'question-bank', icon: 'book', hint: 'Questions, tags, review, papers' },
    { label: 'Examinations', path: 'examinations', icon: 'exam', hint: 'Create, publish, mark, analytics' },
    { label: 'Student Support', path: 'student-support', icon: 'lifebuoy', hint: 'Learning gaps & interventions' },
    { label: 'Parent Communication', path: 'parent-communication', icon: 'message', hint: 'Queries, PTMs, progress' },
    { label: 'Notices', path: 'notices', icon: 'megaphone' },
    { label: 'Reports & Analytics', path: 'reports', icon: 'chart' },
    { label: 'Complaints', path: 'complaints', icon: 'alert' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
  parent: [
    { label: 'Home (Child Overview)', path: '', icon: 'home' },
    { label: 'My Child(ren)', path: 'children', icon: 'users', hint: 'Select child, profile, summary' },
    { label: 'Attendance', path: 'attendance', icon: 'check-square' },
    { label: 'Assignments', path: 'assignments', icon: 'clipboard', hint: 'Work, submission status, feedback' },
    { label: 'Examinations', path: 'examinations', icon: 'exam', hint: 'Schedule and released results' },
    { label: 'PracticePod', path: 'practice', icon: 'target', hint: 'Practice activity (if shared)' },
    { label: 'Progress & Reports', path: 'progress', icon: 'trend', hint: 'Progress, remarks, support plan' },
    { label: 'Communication', path: 'communication', icon: 'message', hint: 'Message teacher, request PTM' },
    { label: 'PTM / Meetings', path: 'ptm', icon: 'video', hint: 'Book, notes, action plan' },
    { label: 'Notices', path: 'notices', icon: 'megaphone', hint: 'View & acknowledge' },
    { label: 'Fees & Payments', path: 'fees', icon: 'wallet' },
    { label: 'Requests', path: 'requests', icon: 'inbox', hint: 'Leave / special request' },
    { label: 'Complaints', path: 'complaints', icon: 'alert' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
  principal: [
    { label: 'Home (Academic Overview)', path: '', icon: 'home' },
    { label: 'Academic Coverage', path: 'academic-coverage', icon: 'book', hint: 'Syllabus progress, plan vs actual' },
    { label: 'Staff Management', path: 'staff', icon: 'users', hint: 'Task completion, workload' },
    { label: 'Attendance Overview', path: 'attendance', icon: 'check-square', hint: 'Class / student / staff' },
    { label: 'Examinations', path: 'examinations', icon: 'exam', hint: 'Readiness, paper approval, results' },
    { label: 'Student Performance', path: 'student-performance', icon: 'trend', hint: 'Analytics, learning gaps' },
    { label: 'Parent Engagement', path: 'parent-engagement', icon: 'message', hint: 'PTM trends, unresolved queries' },
    { label: 'Grievances / Complaints', path: 'grievances', icon: 'alert', hint: 'Track and escalate' },
    { label: 'Notices', path: 'notices', icon: 'megaphone', hint: 'Create & publish' },
    { label: 'Reports & Dashboards', path: 'reports', icon: 'chart', hint: 'Academic + operational' },
    { label: 'Approvals', path: 'approvals', icon: 'check-circle', hint: 'Staff / exam / other' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
  management: [
    { label: 'Home (Institution Overview)', path: '', icon: 'home' },
    { label: 'Multiple Campus View', path: 'campuses', icon: 'building', hint: 'Campus metrics & comparison' },
    { label: 'Academic Reports', path: 'academic-reports', icon: 'file', hint: 'Performance, exam results' },
    { label: 'Operational Reports', path: 'operational-reports', icon: 'layers', hint: 'Attendance, staff, infra, exceptions' },
    { label: 'Financial Management', path: 'financial', icon: 'rupee', hint: 'Fees, revenue, dues' },
    { label: 'Policy & Approvals', path: 'approvals', icon: 'check-circle', hint: 'Major approvals, circulars' },
    { label: 'Grievance Overview', path: 'grievances', icon: 'alert', hint: 'High-level summary' },
    { label: 'Audit & Compliance', path: 'audit', icon: 'shield', hint: 'Logs & audits summary' },
    { label: 'Notices', path: 'notices', icon: 'megaphone', hint: 'Publish (if permitted)' },
    { label: 'Reports & Analytics', path: 'reports', icon: 'chart', hint: 'Custom reports' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
  examController: [
    { label: 'Home (Exam Overview)', path: '', icon: 'home' },
    { label: 'Exam Programme', path: 'programme', icon: 'calendar' },
    { label: 'Question Bank', path: 'question-bank', icon: 'book' },
    { label: 'Paper Assembly', path: 'paper-assembly', icon: 'lock' },
    { label: 'Centre Management', path: 'centres', icon: 'building' },
    { label: 'Exam Day Operations', path: 'exam-day', icon: 'clock' },
    { label: 'Evaluation & Moderation', path: 'evaluation', icon: 'check-square' },
    { label: 'Results', path: 'results', icon: 'check-circle' },
    { label: 'Audit Logs', path: 'audit', icon: 'shield' },
    { label: 'Reports', path: 'reports', icon: 'chart' },
    { label: 'My Profile & Settings', path: 'profile', icon: 'settings' },
  ],
};
