import { Routes } from '@angular/router';
import { InsightPage } from '@features/common/insight/insight-page';

/**
 * Management / Trustee area. Everything is aggregate and limited to the campuses the user
 * is authorized for (campus scope selector in the top bar).
 */
export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  { path: 'campuses', title: 'Multiple Campus View', component: InsightPage, data: { insight: 'mgmt-campuses' } },
  { path: 'academic-reports', title: 'Academic Reports', component: InsightPage, data: { insight: 'mgmt-academic' } },
  { path: 'operational-reports', title: 'Operational Reports', component: InsightPage, data: { insight: 'mgmt-operational' } },
  { path: 'financial', title: 'Financial Management', component: InsightPage, data: { insight: 'mgmt-financial' } },
  {
    path: 'approvals',
    title: 'Policy & Approvals',
    loadComponent: () => import('@features/common/approvals/approvals-page').then((m) => m.ApprovalsPage),
    data: { heading: 'Policy & Approvals', subtitle: 'Major approvals and policy notices / circulars.', categories: ['major'], showCirculars: true },
  },
  { path: 'grievances', title: 'Grievance Overview', component: InsightPage, data: { insight: 'mgmt-grievances' } },
  { path: 'audit', title: 'Audit & Compliance', component: InsightPage, data: { insight: 'mgmt-audit' } },
  { path: 'notices', title: 'Notices', loadComponent: () => import('@features/common/notices/notices-page').then((m) => m.NoticesPage) },
  { path: 'reports', title: 'Reports & Analytics', component: InsightPage, data: { insight: 'mgmt-custom-reports' } },
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
