import { Tone } from '@core/models';

const TONES: Record<string, Tone> = {
  // generic
  draft: 'neutral', pending: 'warning', scheduled: 'info', published: 'success', completed: 'success', closed: 'neutral',
  approved: 'success', rejected: 'danger', active: 'info', done: 'success', in_progress: 'info',
  // work
  submitted: 'info', evaluated: 'success', not_submitted: 'warning', overdue: 'danger', due: 'warning',
  // exams
  awaiting_approval: 'warning', released: 'success', open: 'success', upcoming: 'info', missed: 'danger',
  // questions
  in_review: 'warning',
  // attendance
  present: 'success', absent: 'danger', late: 'warning',
  // fees
  paid: 'success', partial: 'warning', success: 'success', failed: 'danger',
  // complaints
  assigned: 'info', resolved: 'success', reopened: 'warning', escalated: 'danger',
  // ptm
  requested: 'warning',
  // insights
  on_track: 'success', behind: 'danger', ready: 'success', locked: 'accent', passed: 'success',
  high: 'danger', medium: 'warning', low: 'info',
};

const LABELS: Record<string, string> = {
  in_progress: 'In progress', awaiting_approval: 'Awaiting approval', in_review: 'In review',
  not_submitted: 'Not submitted', on_track: 'On track',
};

export const statusTone = (status: string | null | undefined): Tone => (status && TONES[status]) || 'neutral';

export const statusLabel = (status: string | null | undefined): string => {
  if (!status) return '—';
  return LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/[_-]/g, ' ');
};
