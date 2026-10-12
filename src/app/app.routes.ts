import { Routes } from '@angular/router';
import { authGuard, phase2Guard, roleGuard } from '@core/auth/guards';
import { AUTH_ROUTES } from '@features/auth/auth.routes';
import { PublicLayout } from '@layout/public-layout/public-layout';

export const routes: Routes = [
  // Public entry flow
  { path: '', component: PublicLayout, children: AUTH_ROUTES },

  // Authenticated app shell. Each role area is lazy-loaded and only matches for that role.
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('@layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: 'student', canMatch: [roleGuard('student')], loadChildren: () => import('@features/student/student.routes') },
      { path: 'teacher', canMatch: [roleGuard('teacher')], loadChildren: () => import('@features/teacher/teacher.routes') },
      { path: 'parent', canMatch: [roleGuard('parent')], loadChildren: () => import('@features/parent/parent.routes') },
      { path: 'principal', canMatch: [roleGuard('principal')], loadChildren: () => import('@features/principal/principal.routes') },
      { path: 'management', canMatch: [roleGuard('management')], loadChildren: () => import('@features/management/management.routes') },
      {
        path: 'exam-controller',
        canMatch: [phase2Guard, roleGuard('examController')],
        loadChildren: () => import('@features/exam-controller/exam-controller.routes'),
      },
      // Common features across roles
      { path: 'search', title: 'Search', loadComponent: () => import('@features/common/search/search-page').then((m) => m.SearchPage) },
      { path: 'notifications', title: 'Notifications', loadComponent: () => import('@features/common/notifications/notifications-page').then((m) => m.NotificationsPage) },
      { path: 'help', title: 'Help & Support', loadComponent: () => import('@features/common/help/help-page').then((m) => m.HelpPage) },
    ],
  },

  { path: 'access-denied', title: 'Access denied', loadComponent: () => import('@features/common/errors/access-denied').then((m) => m.AccessDenied) },
  { path: '**', title: 'Page not found', loadComponent: () => import('@features/common/errors/not-found').then((m) => m.NotFound) },
];
