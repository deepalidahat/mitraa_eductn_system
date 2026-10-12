import { Routes } from '@angular/router';
import { InsightPage } from '@features/common/insight/insight-page';

/** Principal / HOD area - menu items from the flowchart's Principal / HOD Dashboard. */
export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  { path: 'academic-coverage', title: 'Academic Coverage', component: InsightPage, data: { insight: 'principal-coverage' } },
  { path: 'staff', title: 'Staff Management', component: InsightPage, data: { insight: 'principal-staff' } },
  { path: 'attendance', title: 'Attendance Overview', component: InsightPage, data: { insight: 'principal-attendance' } },
  { path: 'examinations', title: 'Examinations', loadComponent: () => import('./exams/principal-exams').then((m) => m.PrincipalExams) },
  { path: 'student-performance', title: 'Student Performance', component: InsightPage, data: { insight: 'principal-performance' } },
  { path: 'parent-engagement', title: 'Parent Engagement', component: InsightPage, data: { insight: 'principal-engagement' } },
  { path: 'grievances', title: 'Grievances / Complaints', loadComponent: () => import('@features/common/complaints/complaints-page').then((m) => m.ComplaintsPage), data: { heading: 'Grievances / Complaints' } },
  { path: 'notices', title: 'Notices', loadComponent: () => import('@features/common/notices/notices-page').then((m) => m.NoticesPage) },
  { path: 'reports', title: 'Reports & Dashboards', component: InsightPage, data: { insight: 'principal-reports' } },
  {
    path: 'approvals',
    title: 'Approvals',
    loadComponent: () => import('@features/common/approvals/approvals-page').then((m) => m.ApprovalsPage),
    data: { heading: 'Approvals', subtitle: 'Staff, exam and other requests for your campus.', categories: ['staff', 'exam', 'other'] },
  },
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
