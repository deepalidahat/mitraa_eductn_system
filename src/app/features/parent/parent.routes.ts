import { Routes } from '@angular/router';

/** Parent / Guardian area - every page follows the child selected in the top bar. */
export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  { path: 'children', title: 'My Child(ren)', loadComponent: () => import('./children/my-children').then((m) => m.MyChildren) },
  { path: 'attendance', title: 'Attendance', loadComponent: () => import('./attendance/parent-attendance').then((m) => m.ParentAttendance) },
  { path: 'assignments', title: 'Assignments', loadComponent: () => import('./assignments/parent-assignments').then((m) => m.ParentAssignments) },
  { path: 'examinations', title: 'Examinations', loadComponent: () => import('./exams/parent-exams').then((m) => m.ParentExams) },
  { path: 'practice', title: 'PracticePod', loadComponent: () => import('./practice/parent-practice').then((m) => m.ParentPractice) },
  { path: 'progress', title: 'Progress & Reports', loadComponent: () => import('@features/common/performance/performance-view').then((m) => m.PerformanceView) },
  { path: 'communication', title: 'Communication', loadComponent: () => import('./communication/parent-communication-page').then((m) => m.ParentCommunicationPage) },
  { path: 'ptm', title: 'PTM / Meetings', loadComponent: () => import('@features/common/ptm/ptm-page').then((m) => m.PtmPage) },
  { path: 'notices', title: 'Notices', loadComponent: () => import('@features/common/notices/notices-page').then((m) => m.NoticesPage) },
  { path: 'fees', title: 'Fees & Payments', loadComponent: () => import('./fees/fees-page').then((m) => m.FeesPage) },
  { path: 'requests', title: 'Requests', loadComponent: () => import('./requests/requests-page').then((m) => m.RequestsPage) },
  { path: 'complaints', title: 'Complaints', loadComponent: () => import('@features/common/complaints/complaints-page').then((m) => m.ComplaintsPage) },
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
