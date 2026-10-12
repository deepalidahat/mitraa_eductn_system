import { Role } from './role.model';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

// ------------------------------------------------------------- school structure
export interface Campus { id: string; tenantId: string; name: string; city: string; }
export interface Subject { id: string; name: string; }
export interface SchoolClass { id: string; campusId: string; name: string; grade: number; classTeacherId: string; room: string; }
export interface Student {
  id: string; campusId: string; classId: string; userId: string | null; name: string;
  rollNo: number; guardianIds: string[]; dob: string; bloodGroup: string;
}
export interface TimetableSlot { id: string; classId: string; day: string; period: number; time: string; subjectId: string; teacherName: string; teacherId: string; }

// ------------------------------------------------------------- assignments
export type AssignmentStatus = 'draft' | 'scheduled' | 'published';
export interface Assignment {
  id: string; classId: string; subjectId: string; teacherId: string; title: string; description: string;
  publishAt: string | null; dueAt: string; maxMarks: number; allowResubmit: boolean; status: AssignmentStatus;
}
export type SubmissionStatus = 'submitted' | 'evaluated';
export interface Submission {
  id: string; assignmentId: string; studentId: string; submittedAt: string; content: string;
  attachmentName: string | null; attempt: number; status: SubmissionStatus;
  marks: number | null; feedback: string | null; evaluatedAt: string | null;
}

// ------------------------------------------------------------- exams & questions
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'in_review' | 'approved';
export interface Question {
  id: string; subjectId: string; grade: number; chapter: string; text: string; options: string[];
  /** Hidden by the API for students. */
  answerIndex?: number; explanation?: string;
  marks: number; difficulty: Difficulty; status: QuestionStatus; createdBy: string;
}
export type ExamStatus = 'draft' | 'scheduled' | 'published' | 'completed';
export type ResultStatus = 'pending' | 'awaiting_approval' | 'released';
export interface Exam {
  id: string; classId: string; subjectId: string; title: string; createdBy: string; questionIds: string[];
  totalMarks: number; durationMin: number; startAt: string; endAt: string; status: ExamStatus;
  paperApproval: 'pending' | 'approved' | 'rejected'; resultStatus: ResultStatus; moderationRequired: boolean;
  moderated?: boolean;
}
export interface ExamAttempt {
  id: string; examId: string; studentId: string; answers: (number | null)[]; submittedAt: string;
  marks: number | null; autoMarks?: number; status: 'submitted' | 'evaluated'; remarks: string | null; resultHidden?: boolean;
}

// ------------------------------------------------------------- practice
export interface PracticeReviewItem { questionId: string; correctIndex: number; explanation: string; }
export interface PracticeSession {
  id: string; studentId: string; grade: number; subjectId: string; chapter: string; questionIds: string[];
  answers: (number | null)[]; score: number; total: number; mode: 'online' | 'print'; completedAt: string;
  sharedWithParent: boolean; review?: PracticeReviewItem[];
}
export interface PracticeCatalogEntry { grade: number; subjectId: string; chapters: string[]; }
export interface GeneratedPractice { grade: number; subjectId: string; chapter: string; questions: Question[]; }

// ------------------------------------------------------------- attendance
export type AttendanceMark = 'present' | 'absent' | 'late';
export interface AttendanceSheet {
  id: string; classId: string; date: string; session: string; markedBy: string;
  records: { studentId: string; status: AttendanceMark }[];
}

// ------------------------------------------------------------- communication
export interface Notice {
  id: string; title: string; body: string; audience: Role[]; campusIds: string[]; status: 'draft' | 'published';
  publishedAt: string | null; publishedBy: string; requiresAck: boolean; category: string;
}
export interface NoticeAck { id: string; noticeId: string; userId: string; at: string; }
export interface ThreadMessage { id: string; fromId: string; fromName: string; text: string; at: string; }
export type ThreadType = 'doubt' | 'parent-query' | 'progress-share';
export interface Thread {
  id: string; type: ThreadType; subject: string; studentId: string; createdBy: string; participantIds: string[];
  counterpartName: string; status: 'open' | 'resolved'; updatedAt: string; messages: ThreadMessage[];
}
export type PtmStatus = 'requested' | 'scheduled' | 'completed' | 'closed';
export interface ActionPlan { items: string[]; dueDate: string; status: 'in_progress' | 'done'; owner: string; }
export interface Ptm {
  id: string; parentId: string; parentName: string; teacherId: string; teacherName: string; studentId: string; studentName: string;
  agenda: string; requestedAt: string; slot: string | null; mode: 'online' | 'in-person'; status: PtmStatus;
  meetingLink?: string; notes: string | null; actionPlan: ActionPlan | null; followUp?: string;
}
export interface Material { id: string; classId: string; subjectId: string; title: string; type: string; size: string; uploadedBy: string; uploadedAt: string; downloadable: boolean; }

// ------------------------------------------------------------- progress & support
export interface LearningGap { subjectId: string; topic: string; severity: 'low' | 'medium' | 'high'; suggestion: string; }
export interface Performance {
  id: string; studentId: string; overall: number; rank: number; attendancePct: number;
  subjects: { subjectId: string; name: string; score: number; trend: number }[];
  learningGaps: LearningGap[];
  teacherRemarks: { by: string; subject: string; text: string; at: string }[];
}
export interface InterventionPlan {
  id: string; studentId: string; studentName: string; createdBy: string; subjectId: string; gap: string;
  actions: string[]; startDate: string; reviewDate: string; status: 'active' | 'completed'; sharedWithParent: boolean;
}

// ------------------------------------------------------------- grievances
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'reopened' | 'closed' | 'escalated';
export interface Complaint {
  id: string; trackingId: string; raisedById: string; raisedByName: string; raisedByRole: Role; campusId: string;
  category: string; subject: string; description: string; status: ComplaintStatus; ownerName: string;
  slaDueAt: string; escalated: boolean; createdAt: string;
  timeline: { at: string; status: string; note: string }[];
}

// ------------------------------------------------------------- fees, requests, approvals
export interface Fee { id: string; studentId: string; term: string; head: string; amount: number; paid: number; dueDate: string; status: 'paid' | 'due' | 'overdue' | 'partial'; }
export interface Payment { id: string; studentId: string; feeId: string; amount: number; method: string; reference: string; status: 'success' | 'failed'; paidAt: string; }
export interface ParentRequest { id: string; studentId: string; parentId: string; type: 'leave' | 'special'; fromDate: string; toDate: string; reason: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; decisionNote: string | null; }
export interface Approval {
  id: string; campusId: string; category: 'staff' | 'exam' | 'other' | 'major'; level: 'campus' | 'trust';
  title: string; requestedBy: string; requestedAt: string; status: 'pending' | 'approved' | 'rejected';
  details: string; refType?: string; refId?: string; decidedBy?: string; decidedAt?: string; decisionNote?: string;
}

// ------------------------------------------------------------- notifications, dashboards, insights
export interface AppNotification { id: string; userId: string; text: string; link: string; read: boolean; at: string; }

export interface StatItem { label: string; value: string; hint?: string; tone?: Tone; icon?: string; }
export interface Dashboard { id: string; stats: StatItem[]; highlights: { title: string; meta: string; link: string; icon: string }[]; }

export type ColumnType = 'text' | 'percent' | 'currency' | 'badge' | 'date' | 'datetime';
export interface TableColumn { key: string; label: string; type?: ColumnType; }
export type Row = Record<string, unknown>;
export interface InsightSection {
  key: string; title: string; type: 'table' | 'bars'; description?: string;
  columns?: TableColumn[]; rows: Row[]; unit?: string; max?: number;
}
export interface Insight { id: string; title: string; subtitle: string; campusScoped?: boolean; stats: StatItem[]; sections: InsightSection[]; }
