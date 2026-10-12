import { Routes } from '@angular/router';

/** Student area - menu items from the flowchart's Student Dashboard. */
export default [
  { path: '', title: 'Home', loadComponent: () => import('@features/dashboard/role-home').then((m) => m.RoleHome) },
  { path: 'classes', title: 'My Classes & Timetable', loadComponent: () => import('@features/common/timetable/timetable-page').then((m) => m.TimetablePage) },
  { path: 'assignments', title: 'Assignments', loadComponent: () => import('./assignments/student-assignments').then((m) => m.StudentAssignments) },
  { path: 'assignments/:id', title: 'Assignment', loadComponent: () => import('./assignments/assignment-detail').then((m) => m.AssignmentDetail) },
  { path: 'examinations', title: 'Examinations', loadComponent: () => import('./exams/student-exams').then((m) => m.StudentExams) },
  { path: 'examinations/:id/attempt', title: 'Exam attempt', loadComponent: () => import('./exams/exam-attempt').then((m) => m.ExamAttemptPage) },
  { path: 'practice', title: 'PracticePod', loadComponent: () => import('./practice/practice-pod').then((m) => m.PracticePod) },
  { path: 'performance', title: 'My Performance', loadComponent: () => import('@features/common/performance/performance-view').then((m) => m.PerformanceView) },
  { path: 'notices', title: 'Notices', loadComponent: () => import('@features/common/notices/notices-page').then((m) => m.NoticesPage) },
  {
    path: 'messages',
    title: 'Messages',
    loadComponent: () => import('@features/common/threads/threads-page').then((m) => m.ThreadsPage),
    data: { heading: 'Messages (Academic Doubt)', subtitle: 'Ask your teachers about anything you are stuck on.', threadTypes: ['doubt'], composeType: 'doubt', composeLabel: 'Ask a doubt' },
  },
  { path: 'ptm', title: 'PTM / Meetings', loadComponent: () => import('@features/common/ptm/ptm-page').then((m) => m.PtmPage), data: { heading: 'PTM / Meetings (View)' } },
  { path: 'downloads', title: 'Downloads', loadComponent: () => import('./downloads/downloads').then((m) => m.Downloads) },
  { path: 'complaints', title: 'Complaints', loadComponent: () => import('@features/common/complaints/complaints-page').then((m) => m.ComplaintsPage) },
  { path: 'profile', title: 'My Profile & Settings', loadComponent: () => import('@features/common/profile/profile-page').then((m) => m.ProfilePage) },
] satisfies Routes;
