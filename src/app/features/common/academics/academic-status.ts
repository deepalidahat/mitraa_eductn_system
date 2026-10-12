import { Assignment, Exam, ExamAttempt, Submission } from '@core/models';

export type WorkStatus = 'evaluated' | 'submitted' | 'overdue' | 'pending';
export type ExamWindow = 'upcoming' | 'open' | 'submitted' | 'missed' | 'closed';

/** Latest attempt first. */
export const latestSubmission = (assignmentId: string, subs: Submission[]): Submission | undefined =>
  subs.filter((s) => s.assignmentId === assignmentId).sort((a, b) => b.attempt - a.attempt)[0];

export function workStatus(a: Assignment, latest: Submission | undefined, now = Date.now()): WorkStatus {
  if (latest) return latest.status === 'evaluated' ? 'evaluated' : 'submitted';
  return Date.parse(a.dueAt) < now ? 'overdue' : 'pending';
}

/** Resubmission is offered only when the teacher allowed it and the work isn't past due. */
export const canResubmit = (a: Assignment, latest: Submission | undefined, now = Date.now()): boolean =>
  !!latest && a.allowResubmit && Date.parse(a.dueAt) >= now;

export function examWindow(e: Exam, attempt: ExamAttempt | undefined, now = Date.now()): ExamWindow {
  if (attempt) return 'submitted';
  if (now < Date.parse(e.startAt)) return 'upcoming';
  if (now <= Date.parse(e.endAt)) return e.status === 'published' ? 'open' : 'upcoming';
  return e.status === 'completed' ? 'closed' : 'missed';
}

export const resultsReleased = (e: Exam): boolean => e.resultStatus === 'released';
