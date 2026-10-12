import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth/guards';
import { InsightPage } from '@features/common/insight/insight-page';

/** Teacher / Staff area - menu items from the flowchart's Teacher Dashboard. */
export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  { path: 'classes', title: 'My Classes & Timetable', loadComponent: () => import('@features/common/timetable/timetable-page').then((m) => m.TimetablePage) },
  { path: 'attendance', title: 'Attendance', canActivate: [permissionGuard('attendance:mark')], loadComponent: () => import('./attendance/attendance-page').then((m) => m.AttendancePage) },
  { path: 'assignments', title: 'Assignment Engine', canActivate: [permissionGuard('assignment:manage')], loadComponent: () => import('./assignments/teacher-assignments').then((m) => m.TeacherAssignments) },
  { path: 'assignments/:id', title: 'Submissions', canActivate: [permissionGuard('assignment:manage')], loadComponent: () => import('./assignments/assignment-review').then((m) => m.AssignmentReview) },
  { path: 'question-bank', title: 'Question Bank', canActivate: [permissionGuard('question:manage')], loadComponent: () => import('./question-bank/question-bank').then((m) => m.QuestionBank) },
  { path: 'examinations', title: 'Examinations', canActivate: [permissionGuard('exam:manage')], loadComponent: () => import('./exams/teacher-exams').then((m) => m.TeacherExams) },
  { path: 'examinations/:id', title: 'Manage exam', canActivate: [permissionGuard('exam:manage')], loadComponent: () => import('./exams/exam-manage').then((m) => m.ExamManage) },
  { path: 'student-support', title: 'Student Support', canActivate: [permissionGuard('support:manage')], loadComponent: () => import('./student-support/student-support').then((m) => m.StudentSupport) },
  { path: 'parent-communication', title: 'Parent Communication', loadComponent: () => import('./parent-communication/parent-communication').then((m) => m.ParentCommunication) },
  { path: 'notices', title: 'Notices', loadComponent: () => import('@features/common/notices/notices-page').then((m) => m.NoticesPage) },
  { path: 'reports', title: 'Reports & Analytics', component: InsightPage, data: { insight: 'teacher-reports' } },
  { path: 'complaints', title: 'Complaints', loadComponent: () => import('@features/common/complaints/complaints-page').then((m) => m.ComplaintsPage) },
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
