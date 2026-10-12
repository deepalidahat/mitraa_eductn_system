import { Routes } from '@angular/router';
import { InsightPage } from '@features/common/insight/insight-page';

/**
 * Exam Controller - Future / Phase 2.
 * Only reachable when config.phase2Enabled is true (phase2Guard in app.routes + API check).
 * Screens are read-only scaffolds over /api/insights until Phase 2 APIs are defined.
 */
const ec = (path: string, title: string, insight: string) => ({ path, title, component: InsightPage, data: { insight } });

export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  ec('programme', 'Exam Programme', 'ec-programme'),
  ec('question-bank', 'Question Bank', 'ec-questions'),
  ec('paper-assembly', 'Paper Assembly', 'ec-paper'),
  ec('centres', 'Centre Management', 'ec-centres'),
  ec('exam-day', 'Exam Day Operations', 'ec-dayops'),
  ec('evaluation', 'Evaluation & Moderation', 'ec-evaluation'),
  ec('results', 'Results', 'ec-results'),
  ec('audit', 'Audit Logs', 'ec-audit'),
  ec('reports', 'Reports', 'ec-reports'),
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
