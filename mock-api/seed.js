/**
 * Generates mock-api/db.json for json-server.
 * Dates are relative to "now" so open exam windows, due dates and SLAs stay realistic.
 * Run: npm run mock:seed
 */
const fs = require('fs');
const path = require('path');

const NOW = Date.now();
const H = 3600 * 1000;
const D = 24 * H;
const iso = (offsetMs = 0) => new Date(NOW + offsetMs).toISOString();
const day = (offsetDays = 0) => iso(offsetDays * D).slice(0, 10);
const T1 = 't1';
const PASSWORD = 'Password@123';

const config = {
  appName: 'MiTRAA-Edu',
  tagline: 'Connected Education for a Brighter Tomorrow',
  registrationEnabled: true,
  otpEnabled: true,
  otpLength: 6,
  mfaRoles: ['principal', 'management', 'examController'],
  paymentsEnabled: true,
  phase2Enabled: false,
  sessionTimeoutMinutes: 30,
  languages: [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ml', label: 'മലയാളം' },
  ],
};

const tenants = [
  { id: T1, name: 'MiTRAA Public Schools Trust' },
  { id: 't2', name: 'Other Education Society' },
];

const campuses = [
  { id: 'c1', tenantId: T1, name: 'North Campus', city: 'Kochi' },
  { id: 'c2', tenantId: T1, name: 'South Campus', city: 'Thrissur' },
  { id: 'c3', tenantId: 't2', name: 'Riverside Campus', city: 'Pune' },
];

const subjects = [
  { id: 'math', tenantId: T1, name: 'Mathematics' },
  { id: 'sci', tenantId: T1, name: 'Science' },
  { id: 'eng', tenantId: T1, name: 'English' },
  { id: 'sst', tenantId: T1, name: 'Social Studies' },
];

const classes = [
  { id: 'cls-8a', tenantId: T1, campusId: 'c1', name: 'Grade 8 - A', grade: 8, classTeacherId: 'u-teacher', room: 'B-204' },
  { id: 'cls-8b', tenantId: T1, campusId: 'c1', name: 'Grade 8 - B', grade: 8, classTeacherId: 'u-teacher2', room: 'B-205' },
  { id: 'cls-9a', tenantId: T1, campusId: 'c2', name: 'Grade 9 - A', grade: 9, classTeacherId: 'u-teacher2', room: 'S-101' },
];

const students = [
  { id: 's1', tenantId: T1, campusId: 'c1', classId: 'cls-8a', userId: 'u-student', name: 'Aarav Sharma', rollNo: 1, guardianIds: ['u-parent'], dob: '2012-05-14', bloodGroup: 'B+' },
  { id: 's2', tenantId: T1, campusId: 'c1', classId: 'cls-8a', userId: null, name: 'Diya Patel', rollNo: 2, guardianIds: [], dob: '2012-08-02', bloodGroup: 'O+' },
  { id: 's3', tenantId: T1, campusId: 'c2', classId: 'cls-9a', userId: null, name: 'Anika Sharma', rollNo: 7, guardianIds: ['u-parent'], dob: '2011-02-21', bloodGroup: 'A+' },
  { id: 's4', tenantId: T1, campusId: 'c1', classId: 'cls-8a', userId: null, name: 'Kabir Menon', rollNo: 3, guardianIds: [], dob: '2012-01-11', bloodGroup: 'AB+' },
  { id: 's5', tenantId: T1, campusId: 'c1', classId: 'cls-8a', userId: null, name: 'Sara Thomas', rollNo: 4, guardianIds: [], dob: '2012-10-30', bloodGroup: 'O-' },
  { id: 's6', tenantId: T1, campusId: 'c1', classId: 'cls-8b', userId: null, name: 'Rohan Das', rollNo: 1, guardianIds: [], dob: '2012-03-09', bloodGroup: 'B-' },
  { id: 's9', tenantId: 't2', campusId: 'c3', classId: 'cls-x', userId: 'u-other', name: 'Other Tenant Student', rollNo: 1, guardianIds: [], dob: '2012-01-01', bloodGroup: 'O+' },
];

const perms = {
  student: ['assignment:submit', 'exam:attempt', 'practice:use', 'message:send', 'complaint:create'],
  teacher: ['attendance:mark', 'assignment:manage', 'question:manage', 'exam:manage', 'exam:moderate', 'support:manage', 'parent:communicate', 'complaint:create', 'message:send'],
  parent: ['payment:make', 'ptm:book', 'request:create', 'notice:ack', 'complaint:create', 'message:send'],
  principal: ['notice:publish', 'approval:decide', 'paper:approve', 'results:release', 'complaint:manage', 'student:view-detail'],
  management: ['notice:publish', 'approval:decide', 'report:custom'],
  examController: ['exam:programme', 'paper:lock', 'results:authorize'],
};

const user = (id, role, name, email, userCode, extra = {}) => ({
  id, tenantId: T1, role, name, email, userCode, password: PASSWORD,
  phone: '+91 98' + String(10000000 + id.length * 1234567).slice(0, 8),
  mfaEnabled: false, permissions: perms[role], campusIds: ['c1'], avatar: null, language: 'en', ...extra,
});

const users = [
  user('u-student', 'student', 'Aarav Sharma', 'student@mitraa.edu', 'STU1001', { studentId: 's1', classId: 'cls-8a' }),
  user('u-teacher', 'teacher', 'Priya Nair', 'teacher@mitraa.edu', 'TCH2001', { classIds: ['cls-8a', 'cls-8b'], subjectIds: ['math', 'sci'], designation: 'Senior Teacher - Mathematics' }),
  user('u-teacher2', 'teacher', 'Arjun Varma', 'arjun@mitraa.edu', 'TCH2002', { classIds: ['cls-8b', 'cls-9a'], subjectIds: ['eng', 'sst'], campusIds: ['c1', 'c2'], designation: 'Teacher - English' }),
  user('u-parent', 'parent', 'Rajesh Sharma', 'parent@mitraa.edu', 'PAR3001', { childIds: ['s1', 's3'], campusIds: ['c1', 'c2'] }),
  user('u-principal', 'principal', 'Dr. Meera Iyer', 'principal@mitraa.edu', 'PRN4001', { mfaEnabled: true, designation: 'Principal, North Campus' }),
  user('u-mgmt', 'management', 'Vikram Rao', 'trustee@mitraa.edu', 'MGT5001', { mfaEnabled: true, campusIds: ['c1', 'c2'], designation: 'Managing Trustee' }),
  user('u-exam', 'examController', 'Leela George', 'exam@mitraa.edu', 'EXC6001', { mfaEnabled: true, campusIds: ['c1', 'c2'], designation: 'Controller of Examinations' }),
  { ...user('u-other', 'student', 'Other Tenant Student', 'other@school.org', 'OTH0001', { studentId: 's9', classId: 'cls-x' }), tenantId: 't2', campusIds: ['c3'] },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const slots = ['08:30', '09:20', '10:10', '11:15', '12:05'];
const rotation = ['math', 'sci', 'eng', 'sst', 'math'];
const teacherFor = { math: 'Priya Nair', sci: 'Priya Nair', eng: 'Arjun Varma', sst: 'Arjun Varma' };
const timetable = [];
for (const cls of ['cls-8a', 'cls-8b', 'cls-9a']) {
  days.forEach((d, di) => slots.forEach((time, si) => {
    const subjectId = rotation[(di + si) % rotation.length];
    timetable.push({
      id: `tt-${cls}-${di}-${si}`, tenantId: T1, classId: cls, day: d, period: si + 1, time,
      subjectId, teacherName: teacherFor[subjectId], teacherId: subjectId === 'math' || subjectId === 'sci' ? 'u-teacher' : 'u-teacher2',
    });
  }));
}

const assignments = [
  { id: 'a1', tenantId: T1, classId: 'cls-8a', subjectId: 'math', teacherId: 'u-teacher', title: 'Linear Equations - Worksheet 3', description: 'Solve all 15 problems. Show working for questions 10-15.', publishAt: iso(-5 * D), dueAt: iso(2 * D), maxMarks: 20, allowResubmit: true, status: 'published' },
  { id: 'a2', tenantId: T1, classId: 'cls-8a', subjectId: 'sci', teacherId: 'u-teacher', title: 'Photosynthesis Lab Report', description: 'Write up the leaf-starch experiment: aim, materials, method, observations, conclusion.', publishAt: iso(-8 * D), dueAt: iso(-1 * D), maxMarks: 25, allowResubmit: false, status: 'published' },
  { id: 'a3', tenantId: T1, classId: 'cls-8a', subjectId: 'math', teacherId: 'u-teacher', title: 'Mensuration Project', description: 'Measure five objects at home and compute surface area and volume.', publishAt: iso(3 * D), dueAt: iso(10 * D), maxMarks: 30, allowResubmit: true, status: 'scheduled' },
  { id: 'a4', tenantId: T1, classId: 'cls-8b', subjectId: 'math', teacherId: 'u-teacher', title: 'Rational Numbers Practice', description: 'Exercise 1.2, all questions.', publishAt: iso(-2 * D), dueAt: iso(4 * D), maxMarks: 10, allowResubmit: false, status: 'published' },
  { id: 'a5', tenantId: T1, classId: 'cls-9a', subjectId: 'eng', teacherId: 'u-teacher2', title: 'Essay: My Favourite Book', description: '400-500 words.', publishAt: iso(-3 * D), dueAt: iso(3 * D), maxMarks: 15, allowResubmit: true, status: 'published' },
  { id: 'a6', tenantId: T1, classId: 'cls-8a', subjectId: 'sci', teacherId: 'u-teacher', title: 'Draft: Cell Structure Diagram', description: 'Label all organelles.', publishAt: null, dueAt: iso(14 * D), maxMarks: 10, allowResubmit: false, status: 'draft' },
];

const submissions = [
  { id: 'sub1', tenantId: T1, assignmentId: 'a2', studentId: 's1', submittedAt: iso(-2 * D), content: 'Aim: To test a leaf for starch... Conclusion: light is necessary for photosynthesis.', attachmentName: 'lab-report.pdf', attempt: 1, status: 'evaluated', marks: 21, feedback: 'Clear method and observations. Add a labelled diagram next time.', evaluatedAt: iso(-1 * D) },
  { id: 'sub2', tenantId: T1, assignmentId: 'a2', studentId: 's4', submittedAt: iso(-1.5 * D), content: 'Lab report attached.', attachmentName: 'kabir-lab.pdf', attempt: 1, status: 'submitted', marks: null, feedback: null, evaluatedAt: null },
  { id: 'sub3', tenantId: T1, assignmentId: 'a1', studentId: 's2', submittedAt: iso(-0.5 * D), content: 'All 15 solved.', attachmentName: 'ws3.jpg', attempt: 1, status: 'submitted', marks: null, feedback: null, evaluatedAt: null },
  { id: 'sub4', tenantId: T1, assignmentId: 'a5', studentId: 's3', submittedAt: iso(-1 * D), content: 'Essay on "Wings of Fire".', attachmentName: null, attempt: 1, status: 'evaluated', marks: 12, feedback: 'Good structure; work on paragraph transitions.', evaluatedAt: iso(-0.2 * D) },
];

const questions = [
  { id: 'q1', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Linear Equations', text: 'Solve: 3x + 5 = 20', options: ['x = 3', 'x = 5', 'x = 15', 'x = 25/3'], answerIndex: 1, marks: 1, difficulty: 'easy', status: 'approved', explanation: '3x = 15, so x = 5.', createdBy: 'u-teacher' },
  { id: 'q2', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Linear Equations', text: 'If 2(x - 3) = 10, what is x?', options: ['2', '5', '8', '13'], answerIndex: 2, marks: 1, difficulty: 'easy', status: 'approved', explanation: 'x - 3 = 5, so x = 8.', createdBy: 'u-teacher' },
  { id: 'q3', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Linear Equations', text: 'The sum of two consecutive integers is 41. The larger is:', options: ['20', '21', '22', '19'], answerIndex: 1, marks: 2, difficulty: 'medium', status: 'approved', explanation: 'n + (n+1) = 41 gives n = 20, larger = 21.', createdBy: 'u-teacher' },
  { id: 'q4', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Mensuration', text: 'Volume of a cube with side 4 cm is:', options: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], answerIndex: 2, marks: 1, difficulty: 'easy', status: 'approved', explanation: 'V = a³ = 64 cm³.', createdBy: 'u-teacher' },
  { id: 'q5', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Mensuration', text: 'Total surface area of a cuboid 2×3×4 cm is:', options: ['24 cm²', '26 cm²', '52 cm²', '48 cm²'], answerIndex: 2, marks: 2, difficulty: 'medium', status: 'approved', explanation: '2(lb + bh + hl) = 2(6 + 12 + 8) = 52 cm².', createdBy: 'u-teacher' },
  { id: 'q6', tenantId: T1, subjectId: 'math', grade: 8, chapter: 'Mensuration', text: 'Curved surface area of a cylinder r = 7, h = 10 (π = 22/7):', options: ['220', '440', '154', '308'], answerIndex: 1, marks: 2, difficulty: 'hard', status: 'in_review', explanation: '2πrh = 2 × 22/7 × 7 × 10 = 440.', createdBy: 'u-teacher' },
  { id: 'q7', tenantId: T1, subjectId: 'sci', grade: 8, chapter: 'Photosynthesis', text: 'Which pigment absorbs light in photosynthesis?', options: ['Haemoglobin', 'Chlorophyll', 'Melanin', 'Keratin'], answerIndex: 1, marks: 1, difficulty: 'easy', status: 'approved', explanation: 'Chlorophyll in chloroplasts absorbs light energy.', createdBy: 'u-teacher' },
  { id: 'q8', tenantId: T1, subjectId: 'sci', grade: 8, chapter: 'Photosynthesis', text: 'The gas released during photosynthesis is:', options: ['CO₂', 'N₂', 'O₂', 'H₂'], answerIndex: 2, marks: 1, difficulty: 'easy', status: 'approved', explanation: 'Water is split, releasing oxygen.', createdBy: 'u-teacher' },
  { id: 'q9', tenantId: T1, subjectId: 'sci', grade: 8, chapter: 'Cell Structure', text: 'The powerhouse of the cell is the:', options: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi body'], answerIndex: 2, marks: 1, difficulty: 'easy', status: 'approved', explanation: 'Mitochondria produce ATP through respiration.', createdBy: 'u-teacher' },
  { id: 'q10', tenantId: T1, subjectId: 'sci', grade: 8, chapter: 'Cell Structure', text: 'Which structure is found in plant cells but not animal cells?', options: ['Cell membrane', 'Cell wall', 'Cytoplasm', 'Nucleus'], answerIndex: 1, marks: 1, difficulty: 'medium', status: 'draft', explanation: 'Plant cells have a rigid cellulose cell wall.', createdBy: 'u-teacher' },
];

const exams = [
  { id: 'e1', tenantId: T1, classId: 'cls-8a', subjectId: 'math', title: 'Unit Test 2 - Linear Equations', createdBy: 'u-teacher', questionIds: ['q1', 'q2', 'q3'], totalMarks: 4, durationMin: 20, startAt: iso(-1 * D), endAt: iso(30 * D), status: 'published', paperApproval: 'approved', resultStatus: 'pending', moderationRequired: false },
  { id: 'e2', tenantId: T1, classId: 'cls-8a', subjectId: 'sci', title: 'Unit Test 1 - Photosynthesis', createdBy: 'u-teacher', questionIds: ['q7', 'q8'], totalMarks: 2, durationMin: 10, startAt: iso(-12 * D), endAt: iso(-11 * D), status: 'completed', paperApproval: 'approved', resultStatus: 'released', moderationRequired: false },
  { id: 'e3', tenantId: T1, classId: 'cls-8a', subjectId: 'math', title: 'Mid-Term - Mensuration', createdBy: 'u-teacher', questionIds: ['q4', 'q5', 'q6'], totalMarks: 5, durationMin: 30, startAt: iso(9 * D), endAt: iso(9 * D + 2 * H), status: 'scheduled', paperApproval: 'pending', resultStatus: 'pending', moderationRequired: true },
  { id: 'e4', tenantId: T1, classId: 'cls-8a', subjectId: 'sci', title: 'Quiz - Cell Structure', createdBy: 'u-teacher', questionIds: ['q9'], totalMarks: 1, durationMin: 5, startAt: iso(-6 * D), endAt: iso(-5 * D), status: 'completed', paperApproval: 'approved', resultStatus: 'awaiting_approval', moderationRequired: true },
  { id: 'e5', tenantId: T1, classId: 'cls-9a', subjectId: 'eng', title: 'Grammar Test', createdBy: 'u-teacher2', questionIds: [], totalMarks: 20, durationMin: 40, startAt: iso(-15 * D), endAt: iso(-14 * D), status: 'completed', paperApproval: 'approved', resultStatus: 'released', moderationRequired: false },
];

const examAttempts = [
  { id: 'ea1', tenantId: T1, examId: 'e2', studentId: 's1', answers: [1, 2], submittedAt: iso(-11.5 * D), marks: 2, status: 'evaluated', remarks: 'Excellent.' },
  { id: 'ea2', tenantId: T1, examId: 'e4', studentId: 's1', answers: [2], submittedAt: iso(-5.5 * D), marks: 1, status: 'evaluated', remarks: 'Correct.' },
  { id: 'ea3', tenantId: T1, examId: 'e4', studentId: 's4', answers: [0], submittedAt: iso(-5.4 * D), marks: null, status: 'submitted', remarks: null },
  { id: 'ea4', tenantId: T1, examId: 'e5', studentId: 's3', answers: [], submittedAt: iso(-14.5 * D), marks: 16, status: 'evaluated', remarks: 'Good command of tenses.' },
];

const practiceSessions = [
  { id: 'p1', tenantId: T1, studentId: 's1', grade: 8, subjectId: 'math', chapter: 'Linear Equations', questionIds: ['q1', 'q2', 'q3'], answers: [1, 2, 0], score: 2, total: 4, mode: 'online', completedAt: iso(-6 * D), sharedWithParent: true },
  { id: 'p2', tenantId: T1, studentId: 's1', grade: 8, subjectId: 'sci', chapter: 'Photosynthesis', questionIds: ['q7', 'q8'], answers: [1, 2], score: 2, total: 2, mode: 'online', completedAt: iso(-3 * D), sharedWithParent: true },
  { id: 'p3', tenantId: T1, studentId: 's1', grade: 8, subjectId: 'math', chapter: 'Linear Equations', questionIds: ['q1', 'q2', 'q3'], answers: [1, 2, 1], score: 4, total: 4, mode: 'online', completedAt: iso(-1 * D), sharedWithParent: false },
];

// Stored solutions so past practice can be reviewed (answers are never sent with live questions).
for (const p of practiceSessions) {
  p.review = p.questionIds.map((qid) => {
    const q = questions.find((x) => x.id === qid);
    return { questionId: qid, correctIndex: q.answerIndex, explanation: q.explanation };
  });
}

const studentIds8a = ['s1', 's2', 's4', 's5'];
const attendance = [];
for (let i = 1; i <= 6; i++) {
  attendance.push({
    id: `att-8a-${i}`, tenantId: T1, classId: 'cls-8a', date: day(-i), session: 'Morning', markedBy: 'u-teacher',
    records: studentIds8a.map((studentId, idx) => ({ studentId, status: (i + idx) % 7 === 0 ? 'absent' : (i + idx) % 5 === 0 ? 'late' : 'present' })),
  });
}
attendance.push({ id: 'att-9a-1', tenantId: T1, classId: 'cls-9a', date: day(-1), session: 'Morning', markedBy: 'u-teacher2', records: [{ studentId: 's3', status: 'present' }] });
attendance.push({ id: 'att-9a-2', tenantId: T1, classId: 'cls-9a', date: day(-2), session: 'Morning', markedBy: 'u-teacher2', records: [{ studentId: 's3', status: 'absent' }] });

const notices = [
  { id: 'n1', tenantId: T1, title: 'Annual Sports Day', body: 'Annual Sports Day will be held on the main ground. Students should report in house colours by 8:00 AM. Parents are welcome to attend.', audience: ['student', 'parent', 'teacher'], campusIds: ['c1', 'c2'], status: 'published', publishedAt: iso(-2 * D), publishedBy: 'Dr. Meera Iyer', requiresAck: true, category: 'Event' },
  { id: 'n2', tenantId: T1, title: 'Mid-Term Examination Schedule', body: 'Mid-term examinations begin next week. The detailed timetable is available under Examinations.', audience: ['student', 'parent', 'teacher'], campusIds: ['c1'], status: 'published', publishedAt: iso(-4 * D), publishedBy: 'Dr. Meera Iyer', requiresAck: true, category: 'Academic' },
  { id: 'n3', tenantId: T1, title: 'Staff Meeting - Curriculum Review', body: 'All teaching staff to attend the curriculum review meeting in the conference hall at 3:30 PM on Friday.', audience: ['teacher', 'principal'], campusIds: ['c1'], status: 'published', publishedAt: iso(-1 * D), publishedBy: 'Dr. Meera Iyer', requiresAck: false, category: 'Staff' },
  { id: 'n4', tenantId: T1, title: 'Revised Fee Policy Circular', body: 'The trust has approved a revised instalment schedule for the next academic year. Details will be shared with parents.', audience: ['principal', 'management', 'parent'], campusIds: ['c1', 'c2'], status: 'published', publishedAt: iso(-7 * D), publishedBy: 'Vikram Rao', requiresAck: true, category: 'Circular' },
  { id: 'n5', tenantId: T1, title: 'Library Week (Draft)', body: 'Draft announcement for library week activities.', audience: ['student'], campusIds: ['c1'], status: 'draft', publishedAt: null, publishedBy: 'Dr. Meera Iyer', requiresAck: false, category: 'Event' },
];
const noticeAcks = [{ id: 'ack1', tenantId: T1, noticeId: 'n4', userId: 'u-parent', at: iso(-6 * D) }];

const threads = [
  { id: 'th1', tenantId: T1, type: 'doubt', subject: 'Doubt in Worksheet 3, Q12', studentId: 's1', createdBy: 'u-student', participantIds: ['u-student', 'u-teacher'], counterpartName: 'Priya Nair', status: 'open', updatedAt: iso(-0.3 * D),
    messages: [
      { id: 'm1', fromId: 'u-student', fromName: 'Aarav Sharma', text: 'Ma\'am, in Q12 should we move the constant to the right side first?', at: iso(-0.5 * D) },
      { id: 'm2', fromId: 'u-teacher', fromName: 'Priya Nair', text: 'Yes, collect constants on one side and the variable terms on the other.', at: iso(-0.3 * D) },
    ] },
  { id: 'th2', tenantId: T1, type: 'parent-query', subject: 'Aarav\'s progress in Science', studentId: 's1', createdBy: 'u-parent', participantIds: ['u-parent', 'u-teacher'], counterpartName: 'Priya Nair', status: 'open', updatedAt: iso(-1 * D),
    messages: [
      { id: 'm3', fromId: 'u-parent', fromName: 'Rajesh Sharma', text: 'Could you share how Aarav is doing in Science this term?', at: iso(-1 * D) },
    ] },
  { id: 'th3', tenantId: T1, type: 'parent-query', subject: 'Homework load', studentId: 's3', createdBy: 'u-parent', participantIds: ['u-parent', 'u-teacher2'], counterpartName: 'Arjun Varma', status: 'resolved', updatedAt: iso(-5 * D),
    messages: [
      { id: 'm4', fromId: 'u-parent', fromName: 'Rajesh Sharma', text: 'Anika has a lot of homework this week.', at: iso(-6 * D) },
      { id: 'm5', fromId: 'u-teacher2', fromName: 'Arjun Varma', text: 'Noted, we will spread the essay deadline.', at: iso(-5 * D) },
    ] },
];

const ptms = [
  { id: 'ptm1', tenantId: T1, parentId: 'u-parent', parentName: 'Rajesh Sharma', teacherId: 'u-teacher', teacherName: 'Priya Nair', studentId: 's1', studentName: 'Aarav Sharma', agenda: 'Mathematics progress and practice plan', requestedAt: iso(-10 * D), slot: iso(-7 * D), mode: 'in-person', status: 'completed',
    notes: 'Aarav is strong in algebra; needs more practice with word problems.', actionPlan: { items: ['20 min PracticePod daily on word problems', 'Weekly check-in on worksheet scores'], dueDate: day(14), status: 'in_progress', owner: 'Priya Nair' } },
  { id: 'ptm2', tenantId: T1, parentId: 'u-parent', parentName: 'Rajesh Sharma', teacherId: 'u-teacher', teacherName: 'Priya Nair', studentId: 's1', studentName: 'Aarav Sharma', agenda: 'Science lab participation', requestedAt: iso(-1 * D), slot: iso(3 * D), mode: 'online', status: 'scheduled', meetingLink: 'https://meet.example.com/mitraa-ptm2', notes: null, actionPlan: null },
  { id: 'ptm3', tenantId: T1, parentId: 'u-parent', parentName: 'Rajesh Sharma', teacherId: 'u-teacher2', teacherName: 'Arjun Varma', studentId: 's3', studentName: 'Anika Sharma', agenda: 'English reading habits', requestedAt: iso(-0.5 * D), slot: null, mode: 'in-person', status: 'requested', notes: null, actionPlan: null },
];

const materials = [
  { id: 'mat1', tenantId: T1, classId: 'cls-8a', subjectId: 'math', title: 'Linear Equations - Notes', type: 'PDF', size: '1.2 MB', uploadedBy: 'Priya Nair', uploadedAt: iso(-9 * D), downloadable: true },
  { id: 'mat2', tenantId: T1, classId: 'cls-8a', subjectId: 'sci', title: 'Photosynthesis - Video Lesson', type: 'Video', size: '48 MB', uploadedBy: 'Priya Nair', uploadedAt: iso(-12 * D), downloadable: false },
  { id: 'mat3', tenantId: T1, classId: 'cls-8a', subjectId: 'eng', title: 'Grammar Handbook', type: 'PDF', size: '3.4 MB', uploadedBy: 'Arjun Varma', uploadedAt: iso(-20 * D), downloadable: true },
  { id: 'mat4', tenantId: T1, classId: 'cls-8a', subjectId: 'sst', title: 'Indian Freedom Struggle - Slides', type: 'PPT', size: '6.1 MB', uploadedBy: 'Arjun Varma', uploadedAt: iso(-4 * D), downloadable: true },
];

const performance = [
  { id: 's1', tenantId: T1, studentId: 's1', overall: 82, rank: 4, attendancePct: 94,
    subjects: [{ subjectId: 'math', name: 'Mathematics', score: 86, trend: 4 }, { subjectId: 'sci', name: 'Science', score: 78, trend: -2 }, { subjectId: 'eng', name: 'English', score: 84, trend: 3 }, { subjectId: 'sst', name: 'Social Studies', score: 80, trend: 1 }],
    learningGaps: [{ subjectId: 'math', topic: 'Word problems on linear equations', severity: 'medium', suggestion: 'PracticePod: Linear Equations (medium/hard)' }, { subjectId: 'sci', topic: 'Labelled diagrams', severity: 'low', suggestion: 'Review Cell Structure diagrams' }],
    teacherRemarks: [{ by: 'Priya Nair', subject: 'Mathematics', text: 'Consistent effort; attempts all questions.', at: iso(-6 * D) }, { by: 'Arjun Varma', subject: 'English', text: 'Reads well; should write more.', at: iso(-10 * D) }] },
  { id: 's3', tenantId: T1, studentId: 's3', overall: 76, rank: 9, attendancePct: 89,
    subjects: [{ subjectId: 'math', name: 'Mathematics', score: 70, trend: -3 }, { subjectId: 'sci', name: 'Science', score: 74, trend: 2 }, { subjectId: 'eng', name: 'English', score: 85, trend: 5 }, { subjectId: 'sst', name: 'Social Studies', score: 75, trend: 0 }],
    learningGaps: [{ subjectId: 'math', topic: 'Quadratic factorisation', severity: 'high', suggestion: 'Remedial session + PracticePod' }],
    teacherRemarks: [{ by: 'Arjun Varma', subject: 'English', text: 'Excellent essay writing.', at: iso(-3 * D) }] },
  { id: 's2', tenantId: T1, studentId: 's2', overall: 68, rank: 15, attendancePct: 91, subjects: [{ subjectId: 'math', name: 'Mathematics', score: 61, trend: -5 }, { subjectId: 'sci', name: 'Science', score: 72, trend: 1 }], learningGaps: [{ subjectId: 'math', topic: 'Negative numbers in equations', severity: 'high', suggestion: 'Intervention plan' }], teacherRemarks: [] },
  { id: 's4', tenantId: T1, studentId: 's4', overall: 74, rank: 11, attendancePct: 86, subjects: [{ subjectId: 'math', name: 'Mathematics', score: 77, trend: 2 }, { subjectId: 'sci', name: 'Science', score: 66, trend: -4 }], learningGaps: [{ subjectId: 'sci', topic: 'Photosynthesis equation', severity: 'medium', suggestion: 'Revision worksheet' }], teacherRemarks: [] },
];

const interventionPlans = [
  { id: 'ip1', tenantId: T1, studentId: 's2', studentName: 'Diya Patel', createdBy: 'u-teacher', subjectId: 'math', gap: 'Negative numbers in equations', actions: ['Two remedial sessions per week', 'Targeted PracticePod set'], startDate: day(-7), reviewDate: day(14), status: 'active', sharedWithParent: true },
];

const complaints = [
  { id: 'cmp1', tenantId: T1, trackingId: 'GRV-240117', raisedById: 'u-parent', raisedByName: 'Rajesh Sharma', raisedByRole: 'parent', campusId: 'c1', category: 'Transport', subject: 'School bus delayed repeatedly', description: 'Route 7 bus has been 20+ minutes late for the past week.', status: 'in_progress', ownerName: 'Transport Coordinator', slaDueAt: iso(1 * D), escalated: false, createdAt: iso(-2 * D),
    timeline: [{ at: iso(-2 * D), status: 'open', note: 'Complaint submitted' }, { at: iso(-1.8 * D), status: 'assigned', note: 'Assigned to Transport Coordinator (SLA 72h)' }, { at: iso(-1 * D), status: 'in_progress', note: 'Driver and route timing under review' }] },
  { id: 'cmp2', tenantId: T1, trackingId: 'GRV-240112', raisedById: 'u-student', raisedByName: 'Aarav Sharma', raisedByRole: 'student', campusId: 'c1', category: 'Facilities', subject: 'Water cooler not working - Block B', description: 'The cooler on the second floor of Block B has not worked for 3 days.', status: 'resolved', ownerName: 'Facilities Manager', slaDueAt: iso(-3 * D), escalated: false, createdAt: iso(-6 * D),
    timeline: [{ at: iso(-6 * D), status: 'open', note: 'Complaint submitted' }, { at: iso(-5.9 * D), status: 'assigned', note: 'Assigned to Facilities Manager (SLA 72h)' }, { at: iso(-4 * D), status: 'resolved', note: 'Cooler repaired and tested' }] },
  { id: 'cmp3', tenantId: T1, trackingId: 'GRV-240120', raisedById: 'u-teacher', raisedByName: 'Priya Nair', raisedByRole: 'teacher', campusId: 'c1', category: 'Academic', subject: 'Projector in B-204 flickering', description: 'Hard to present slides in class.', status: 'assigned', ownerName: 'IT Support', slaDueAt: iso(-0.2 * D), escalated: true, createdAt: iso(-3.5 * D),
    timeline: [{ at: iso(-3.5 * D), status: 'open', note: 'Complaint submitted' }, { at: iso(-3.4 * D), status: 'assigned', note: 'Assigned to IT Support (SLA 72h)' }, { at: iso(-0.1 * D), status: 'escalated', note: 'SLA breached - escalated to Principal' }] },
];

const fees = [
  { id: 'f1', tenantId: T1, studentId: 's1', term: 'Term 1', head: 'Tuition Fee', amount: 24000, paid: 24000, dueDate: day(-60), status: 'paid' },
  { id: 'f2', tenantId: T1, studentId: 's1', term: 'Term 2', head: 'Tuition Fee', amount: 24000, paid: 0, dueDate: day(10), status: 'due' },
  { id: 'f3', tenantId: T1, studentId: 's1', term: 'Term 2', head: 'Transport Fee', amount: 6000, paid: 0, dueDate: day(-3), status: 'overdue' },
  { id: 'f4', tenantId: T1, studentId: 's3', term: 'Term 1', head: 'Tuition Fee', amount: 26000, paid: 26000, dueDate: day(-60), status: 'paid' },
  { id: 'f5', tenantId: T1, studentId: 's3', term: 'Term 2', head: 'Tuition Fee', amount: 26000, paid: 13000, dueDate: day(10), status: 'partial' },
];
const payments = [
  { id: 'pay1', tenantId: T1, studentId: 's1', feeId: 'f1', amount: 24000, method: 'UPI', reference: 'TXN83920193', status: 'success', paidAt: iso(-62 * D) },
  { id: 'pay2', tenantId: T1, studentId: 's3', feeId: 'f5', amount: 13000, method: 'Card', reference: 'TXN83920555', status: 'success', paidAt: iso(-20 * D) },
];

const requests = [
  { id: 'r1', tenantId: T1, studentId: 's1', parentId: 'u-parent', type: 'leave', fromDate: day(-20), toDate: day(-19), reason: 'Family function', status: 'approved', createdAt: iso(-25 * D), decisionNote: 'Approved by class teacher' },
  { id: 'r2', tenantId: T1, studentId: 's3', parentId: 'u-parent', type: 'special', fromDate: day(5), toDate: day(5), reason: 'Early pickup for medical appointment at 12:30', status: 'pending', createdAt: iso(-0.5 * D), decisionNote: null },
];

const approvals = [
  { id: 'ap1', tenantId: T1, campusId: 'c1', category: 'exam', level: 'campus', title: 'Paper approval: Mid-Term - Mensuration (Grade 8)', requestedBy: 'Priya Nair', requestedAt: iso(-1 * D), status: 'pending', refType: 'exam', refId: 'e3', details: '3 questions, 5 marks, 30 minutes. Moderation required.' },
  { id: 'ap2', tenantId: T1, campusId: 'c1', category: 'staff', level: 'campus', title: 'Leave: Arjun Varma (2 days)', requestedBy: 'Arjun Varma', requestedAt: iso(-2 * D), status: 'pending', details: 'Personal leave. Substitution arranged for 8B English.' },
  { id: 'ap3', tenantId: T1, campusId: 'c1', category: 'other', level: 'campus', title: 'Field trip: Science museum (Grade 8)', requestedBy: 'Priya Nair', requestedAt: iso(-4 * D), status: 'approved', details: '62 students, 4 staff. Transport by school buses.' },
  { id: 'ap4', tenantId: T1, campusId: 'c2', category: 'major', level: 'trust', title: 'Capex: New smart classrooms (South Campus)', requestedBy: 'Dr. Meera Iyer', requestedAt: iso(-3 * D), status: 'pending', details: '12 classrooms, estimated ₹18.4L. Vendor shortlist attached.' },
  { id: 'ap5', tenantId: T1, campusId: 'c1', category: 'major', level: 'trust', title: 'Policy: Revised fee instalment schedule', requestedBy: 'Finance Office', requestedAt: iso(-9 * D), status: 'approved', details: 'Three instalments instead of two.' },
];

const notifications = [
  { id: 'nt1', tenantId: T1, userId: 'u-student', text: 'New assignment: Linear Equations - Worksheet 3', link: '/student/assignments/a1', read: false, at: iso(-5 * D) },
  { id: 'nt2', tenantId: T1, userId: 'u-student', text: 'Feedback received on Photosynthesis Lab Report', link: '/student/assignments/a2', read: false, at: iso(-1 * D) },
  { id: 'nt3', tenantId: T1, userId: 'u-parent', text: 'PTM confirmed with Priya Nair', link: '/parent/ptm', read: false, at: iso(-1 * D) },
  { id: 'nt4', tenantId: T1, userId: 'u-parent', text: 'Transport fee is overdue', link: '/parent/fees', read: false, at: iso(-3 * D) },
  { id: 'nt5', tenantId: T1, userId: 'u-teacher', text: '2 submissions awaiting evaluation', link: '/teacher/assignments', read: false, at: iso(-0.5 * D) },
  { id: 'nt6', tenantId: T1, userId: 'u-principal', text: 'Complaint GRV-240120 escalated (SLA breached)', link: '/principal/grievances', read: false, at: iso(-0.1 * D) },
  { id: 'nt7', tenantId: T1, userId: 'u-principal', text: 'Paper approval pending: Mid-Term - Mensuration', link: '/principal/examinations', read: false, at: iso(-1 * D) },
  { id: 'nt8', tenantId: T1, userId: 'u-mgmt', text: 'Major approval pending: Smart classrooms capex', link: '/management/approvals', read: false, at: iso(-3 * D) },
];

const auditLogs = [
  { id: 'al1', tenantId: T1, at: iso(-1 * D), actorName: 'Dr. Meera Iyer', actorRole: 'principal', action: 'PUBLISH', resource: 'notices', resourceId: 'n3', campusId: 'c1', ip: '10.0.1.24' },
  { id: 'al2', tenantId: T1, at: iso(-2 * D), actorName: 'Priya Nair', actorRole: 'teacher', action: 'UPDATE', resource: 'submissions', resourceId: 'sub1', campusId: 'c1', ip: '10.0.1.51' },
  { id: 'al3', tenantId: T1, at: iso(-3 * D), actorName: 'Vikram Rao', actorRole: 'management', action: 'APPROVE', resource: 'approvals', resourceId: 'ap5', campusId: 'c1', ip: '10.0.0.8' },
];

// ---- Dashboards (home pages). Metric choice is a placeholder until product confirms cards. ----
const dashboards = [
  { id: 'student', stats: [{ label: 'Assignments due', value: '2', hint: 'this week', tone: 'warning', icon: 'clipboard' }, { label: 'Next exam', value: 'Open now', hint: 'Unit Test 2 - Maths', tone: 'info', icon: 'exam' }, { label: 'Attendance', value: '94%', hint: 'this term', tone: 'success', icon: 'check-square' }, { label: 'Practice streak', value: '3 days', hint: 'PracticePod', tone: 'accent', icon: 'target' }],
    highlights: [{ title: 'Linear Equations - Worksheet 3', meta: 'Due in 2 days', link: '/student/assignments/a1', icon: 'clipboard' }, { title: 'Unit Test 2 - Linear Equations', meta: 'Attempt window open', link: '/student/examinations', icon: 'exam' }, { title: 'Annual Sports Day', meta: 'New notice', link: '/student/notices', icon: 'megaphone' }] },
  { id: 'teacher', stats: [{ label: 'Classes today', value: '5', hint: '8A, 8B', tone: 'info', icon: 'calendar' }, { label: 'To evaluate', value: '3', hint: 'submissions & attempts', tone: 'warning', icon: 'clipboard' }, { label: 'Open parent queries', value: '1', hint: 'respond within 48h', tone: 'danger', icon: 'message' }, { label: 'Questions in review', value: '1', hint: 'question bank', tone: 'accent', icon: 'book' }],
    highlights: [{ title: 'Mark attendance for Grade 8 - A', meta: 'Morning session', link: '/teacher/attendance', icon: 'check-square' }, { title: 'Evaluate: Photosynthesis Lab Report', meta: '1 submission pending', link: '/teacher/assignments', icon: 'clipboard' }, { title: 'Respond: Aarav\'s progress in Science', meta: 'Parent query', link: '/teacher/parent-communication', icon: 'message' }] },
  { id: 'parent-s1', stats: [{ label: 'Attendance', value: '94%', hint: 'this term', tone: 'success', icon: 'check-square' }, { label: 'Pending work', value: '1', hint: 'assignment due', tone: 'warning', icon: 'clipboard' }, { label: 'Fees due', value: '₹30,000', hint: '1 overdue', tone: 'danger', icon: 'wallet' }, { label: 'Next PTM', value: 'In 3 days', hint: 'Priya Nair (online)', tone: 'info', icon: 'users' }],
    highlights: [{ title: 'Feedback on Photosynthesis Lab Report', meta: '21 / 25', link: '/parent/assignments', icon: 'clipboard' }, { title: 'Transport fee overdue', meta: '₹6,000', link: '/parent/fees', icon: 'wallet' }, { title: 'Annual Sports Day', meta: 'Acknowledgement required', link: '/parent/notices', icon: 'megaphone' }] },
  { id: 'parent-s3', stats: [{ label: 'Attendance', value: '89%', hint: 'this term', tone: 'warning', icon: 'check-square' }, { label: 'Pending work', value: '0', hint: 'all submitted', tone: 'success', icon: 'clipboard' }, { label: 'Fees due', value: '₹13,000', hint: 'partial payment', tone: 'warning', icon: 'wallet' }, { label: 'PTM request', value: 'Pending', hint: 'Arjun Varma', tone: 'info', icon: 'users' }],
    highlights: [{ title: 'Essay: My Favourite Book', meta: 'Evaluated - 12 / 15', link: '/parent/assignments', icon: 'clipboard' }, { title: 'Early pickup request', meta: 'Awaiting approval', link: '/parent/requests', icon: 'inbox' }] },
  { id: 'principal', stats: [{ label: 'Syllabus coverage', value: '71%', hint: 'plan: 75%', tone: 'warning', icon: 'book' }, { label: 'Student attendance', value: '92.4%', hint: 'today', tone: 'success', icon: 'check-square' }, { label: 'Pending approvals', value: '2', hint: 'exam, staff', tone: 'accent', icon: 'check-circle' }, { label: 'Escalations', value: '1', hint: 'SLA breached', tone: 'danger', icon: 'alert' }],
    highlights: [{ title: 'Approve paper: Mid-Term - Mensuration', meta: 'Requested by Priya Nair', link: '/principal/examinations', icon: 'exam' }, { title: 'Release results: Quiz - Cell Structure', meta: 'Awaiting approval', link: '/principal/examinations', icon: 'check-circle' }, { title: 'GRV-240120 escalated', meta: 'Projector in B-204', link: '/principal/grievances', icon: 'alert' }] },
  { id: 'management', stats: [{ label: 'Total students', value: '2,184', hint: '2 campuses', tone: 'info', icon: 'users' }, { label: 'Fee collection', value: '78%', hint: '₹3.42 Cr of ₹4.38 Cr', tone: 'warning', icon: 'wallet' }, { label: 'Avg. performance', value: '74.6%', hint: '+1.8 vs last term', tone: 'success', icon: 'trend' }, { label: 'Major approvals', value: '1', hint: 'pending', tone: 'accent', icon: 'check-circle' }],
    highlights: [{ title: 'Capex: New smart classrooms', meta: 'Major approval pending', link: '/management/approvals', icon: 'check-circle' }, { title: 'South Campus attendance dip', meta: 'Exception flagged', link: '/management/operational-reports', icon: 'alert' }] },
  { id: 'examController', stats: [{ label: 'Active programmes', value: '2', hint: 'Term-end, Board prep', tone: 'info', icon: 'layers' }, { label: 'Centres ready', value: '5 / 6', hint: '1 pending audit', tone: 'warning', icon: 'building' }, { label: 'Papers locked', value: '14', hint: 'of 18', tone: 'accent', icon: 'lock' }, { label: 'Open incidents', value: '0', hint: 'today', tone: 'success', icon: 'shield' }],
    highlights: [{ title: 'Centre C-06 readiness audit', meta: 'Due tomorrow', link: '/exam-controller/centres', icon: 'building' }] },
];

// ---- Insight pages: aggregate/report screens rendered by the generic Insight page. ----
const insights = [
  { id: 'teacher-reports', title: 'Reports & Analytics', subtitle: 'Class and subject performance for your assigned classes.',
    stats: [{ label: 'Avg. score (8A Maths)', value: '78%', tone: 'info' }, { label: 'Submission rate', value: '86%', tone: 'success' }, { label: 'Attendance (8A)', value: '93%', tone: 'success' }],
    sections: [
      { key: 'class', title: 'Class Summary', type: 'table', columns: [{ key: 'class', label: 'Class' }, { key: 'subject', label: 'Subject' }, { key: 'avg', label: 'Avg. score', type: 'percent' }, { key: 'submission', label: 'Submission rate', type: 'percent' }, { key: 'gaps', label: 'Students with gaps' }], rows: [{ class: 'Grade 8 - A', subject: 'Mathematics', avg: 78, submission: 88, gaps: 3 }, { class: 'Grade 8 - A', subject: 'Science', avg: 74, submission: 84, gaps: 4 }, { class: 'Grade 8 - B', subject: 'Mathematics', avg: 71, submission: 80, gaps: 6 }] },
      { key: 'chapters', title: 'Chapter Mastery', type: 'bars', unit: '%', rows: [{ label: 'Linear Equations', value: 81 }, { label: 'Mensuration', value: 64 }, { label: 'Photosynthesis', value: 77 }, { label: 'Cell Structure', value: 70 }] },
    ] },
  { id: 'principal-coverage', title: 'Academic Coverage', subtitle: 'Syllabus progress and curriculum plan versus actual delivery.',
    stats: [{ label: 'Overall coverage', value: '71%', tone: 'warning' }, { label: 'Planned to date', value: '75%', tone: 'info' }, { label: 'Subjects behind plan', value: '3', tone: 'danger' }],
    sections: [
      { key: 'syllabus', title: 'Syllabus Progress', type: 'table', columns: [{ key: 'class', label: 'Class' }, { key: 'subject', label: 'Subject' }, { key: 'teacher', label: 'Teacher' }, { key: 'covered', label: 'Covered', type: 'percent' }, { key: 'status', label: 'Status', type: 'badge' }], rows: [{ class: 'Grade 8 - A', subject: 'Mathematics', teacher: 'Priya Nair', covered: 74, status: 'on_track' }, { class: 'Grade 8 - A', subject: 'Science', teacher: 'Priya Nair', covered: 66, status: 'behind' }, { class: 'Grade 8 - B', subject: 'English', teacher: 'Arjun Varma', covered: 79, status: 'on_track' }, { class: 'Grade 8 - B', subject: 'Social Studies', teacher: 'Arjun Varma', covered: 58, status: 'behind' }] },
      { key: 'plan', title: 'Curriculum Plan vs Actual', type: 'table', columns: [{ key: 'month', label: 'Month' }, { key: 'planned', label: 'Planned chapters' }, { key: 'actual', label: 'Delivered chapters' }, { key: 'variance', label: 'Variance' }], rows: [{ month: 'June', planned: 12, actual: 12, variance: 0 }, { month: 'July', planned: 14, actual: 13, variance: -1 }, { month: 'August', planned: 15, actual: 12, variance: -3 }, { month: 'September', planned: 14, actual: 13, variance: -1 }] },
    ] },
  { id: 'principal-staff', title: 'Staff Management', subtitle: 'Teacher task completion and workload distribution.',
    stats: [{ label: 'Teaching staff', value: '64', tone: 'info' }, { label: 'Task completion', value: '87%', tone: 'success' }, { label: 'Overloaded staff', value: '4', tone: 'warning' }],
    sections: [
      { key: 'tasks', title: 'Teacher Task Completion', type: 'table', columns: [{ key: 'teacher', label: 'Teacher' }, { key: 'lessonPlans', label: 'Lesson plans', type: 'percent' }, { key: 'evaluation', label: 'Evaluation', type: 'percent' }, { key: 'attendance', label: 'Attendance marked', type: 'percent' }, { key: 'status', label: 'Status', type: 'badge' }], rows: [{ teacher: 'Priya Nair', lessonPlans: 100, evaluation: 82, attendance: 100, status: 'on_track' }, { teacher: 'Arjun Varma', lessonPlans: 90, evaluation: 95, attendance: 96, status: 'on_track' }, { teacher: 'Sunita Rao', lessonPlans: 70, evaluation: 60, attendance: 88, status: 'behind' }] },
      { key: 'workload', title: 'Workload View', type: 'bars', unit: ' periods/wk', max: 36, rows: [{ label: 'Priya Nair', value: 32 }, { label: 'Arjun Varma', value: 28 }, { label: 'Sunita Rao', value: 34 }, { label: 'Kiran Joseph', value: 22 }] },
    ] },
  { id: 'principal-attendance', title: 'Attendance Overview', subtitle: 'Attendance by class, student and staff.',
    stats: [{ label: 'Students today', value: '92.4%', tone: 'success' }, { label: 'Staff today', value: '96.9%', tone: 'success' }, { label: 'Chronic absentees', value: '11', tone: 'warning' }],
    sections: [
      { key: 'class', title: 'Class', type: 'bars', unit: '%', rows: [{ label: 'Grade 8 - A', value: 94 }, { label: 'Grade 8 - B', value: 91 }, { label: 'Grade 9 - A', value: 89 }, { label: 'Grade 10 - A', value: 95 }] },
      { key: 'student', title: 'Student', type: 'table', columns: [{ key: 'student', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'pct', label: 'Attendance', type: 'percent' }, { key: 'absences', label: 'Absences (30d)' }], rows: [{ student: 'Kabir Menon', class: 'Grade 8 - A', pct: 86, absences: 4 }, { student: 'Rohan Das', class: 'Grade 8 - B', pct: 79, absences: 6 }, { student: 'Anika Sharma', class: 'Grade 9 - A', pct: 89, absences: 3 }] },
      { key: 'staff', title: 'Staff', type: 'table', columns: [{ key: 'name', label: 'Staff' }, { key: 'dept', label: 'Department' }, { key: 'pct', label: 'Attendance', type: 'percent' }, { key: 'leave', label: 'Leave taken' }], rows: [{ name: 'Priya Nair', dept: 'Mathematics', pct: 99, leave: 1 }, { name: 'Arjun Varma', dept: 'English', pct: 95, leave: 3 }, { name: 'Sunita Rao', dept: 'Science', pct: 92, leave: 5 }] },
    ] },
  { id: 'principal-performance', title: 'Student Performance', subtitle: 'Class and subject analytics with learning-gap summary.',
    stats: [{ label: 'Campus average', value: '75.8%', tone: 'info' }, { label: 'Pass rate', value: '96%', tone: 'success' }, { label: 'Students needing support', value: '38', tone: 'warning' }],
    sections: [
      { key: 'analytics', title: 'Class / Subject Analytics', type: 'table', columns: [{ key: 'class', label: 'Class' }, { key: 'math', label: 'Maths', type: 'percent' }, { key: 'sci', label: 'Science', type: 'percent' }, { key: 'eng', label: 'English', type: 'percent' }, { key: 'sst', label: 'SST', type: 'percent' }], rows: [{ class: 'Grade 8 - A', math: 78, sci: 74, eng: 82, sst: 77 }, { class: 'Grade 8 - B', math: 71, sci: 73, eng: 79, sst: 70 }, { class: 'Grade 9 - A', math: 69, sci: 75, eng: 84, sst: 76 }] },
      { key: 'gaps', title: 'Learning Gaps', type: 'bars', unit: ' students', rows: [{ label: 'Word problems (Maths)', value: 14 }, { label: 'Diagrams (Science)', value: 9 }, { label: 'Essay structure (English)', value: 8 }, { label: 'Map work (SST)', value: 7 }] },
    ] },
  { id: 'principal-engagement', title: 'Parent Engagement', subtitle: 'PTM trends and unresolved parent queries.',
    stats: [{ label: 'PTM attendance', value: '81%', tone: 'success' }, { label: 'Unresolved queries', value: '6', tone: 'warning' }, { label: 'Avg. response time', value: '19h', tone: 'info' }],
    sections: [
      { key: 'trends', title: 'PTM Trends', type: 'bars', unit: ' meetings', rows: [{ label: 'June', value: 42 }, { label: 'July', value: 58 }, { label: 'August', value: 37 }, { label: 'September', value: 64 }] },
      { key: 'unresolved', title: 'Unresolved Queries', type: 'table', columns: [{ key: 'parent', label: 'Parent' }, { key: 'teacher', label: 'Teacher' }, { key: 'subject', label: 'Subject' }, { key: 'age', label: 'Open for' }], rows: [{ parent: 'Rajesh Sharma', teacher: 'Priya Nair', subject: 'Progress in Science', age: '1 day' }, { parent: 'Neha Kapoor', teacher: 'Sunita Rao', subject: 'Lab safety', age: '3 days' }] },
    ] },
  { id: 'principal-reports', title: 'Reports & Dashboards', subtitle: 'Academic and operational reports for your campus.',
    stats: [{ label: 'Reports available', value: '12', tone: 'info' }, { label: 'Last generated', value: 'Today', tone: 'success' }],
    sections: [
      { key: 'academic', title: 'Academic', type: 'table', columns: [{ key: 'report', label: 'Report' }, { key: 'period', label: 'Period' }, { key: 'value', label: 'Headline' }], rows: [{ report: 'Term results summary', period: 'Term 1', value: 'Avg. 75.8%' }, { report: 'Subject toppers', period: 'Term 1', value: '24 students' }, { report: 'Assignment completion', period: 'Last 30 days', value: '86%' }] },
      { key: 'operational', title: 'Operational', type: 'table', columns: [{ key: 'report', label: 'Report' }, { key: 'period', label: 'Period' }, { key: 'value', label: 'Headline' }], rows: [{ report: 'Attendance summary', period: 'Last 30 days', value: '92.1%' }, { report: 'Transport punctuality', period: 'Last 30 days', value: '88%' }, { report: 'Grievance SLA', period: 'Last 30 days', value: '91% within SLA' }] },
    ] },
  { id: 'mgmt-campuses', title: 'Multiple Campus View', subtitle: 'Campus-wise metrics and comparative reports for campuses you are authorized to see.', campusScoped: true,
    stats: [{ label: 'Campuses', value: '2', tone: 'info' }, { label: 'Students', value: '2,184', tone: 'info' }, { label: 'Staff', value: '148', tone: 'info' }],
    sections: [
      { key: 'metrics', title: 'Campus-wise Metrics', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'students', label: 'Students' }, { key: 'staff', label: 'Staff' }, { key: 'attendance', label: 'Attendance', type: 'percent' }, { key: 'performance', label: 'Avg. score', type: 'percent' }, { key: 'feeCollection', label: 'Fee collection', type: 'percent' }], rows: [{ campusId: 'c1', campus: 'North Campus', students: 1240, staff: 84, attendance: 93, performance: 76, feeCollection: 82 }, { campusId: 'c2', campus: 'South Campus', students: 944, staff: 64, attendance: 89, performance: 73, feeCollection: 73 }] },
      { key: 'compare', title: 'Comparative Reports', type: 'bars', unit: '%', rows: [{ campusId: 'c1', label: 'North - Avg. score', value: 76 }, { campusId: 'c2', label: 'South - Avg. score', value: 73 }, { campusId: 'c1', label: 'North - Attendance', value: 93 }, { campusId: 'c2', label: 'South - Attendance', value: 89 }] },
    ] },
  { id: 'mgmt-academic', title: 'Academic Reports', subtitle: 'Aggregate performance and exam results. Individual records are not shown here.', campusScoped: true,
    stats: [{ label: 'Avg. performance', value: '74.6%', tone: 'success' }, { label: 'Pass rate', value: '95%', tone: 'success' }, { label: 'Distinctions', value: '312', tone: 'accent' }],
    sections: [
      { key: 'performance', title: 'Performance Overview', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'grade', label: 'Grade band' }, { key: 'avg', label: 'Avg. score', type: 'percent' }, { key: 'trend', label: 'Trend vs last term' }], rows: [{ campusId: 'c1', campus: 'North Campus', grade: '6-8', avg: 77, trend: '+2.1' }, { campusId: 'c1', campus: 'North Campus', grade: '9-10', avg: 75, trend: '+1.4' }, { campusId: 'c2', campus: 'South Campus', grade: '6-8', avg: 74, trend: '+0.8' }, { campusId: 'c2', campus: 'South Campus', grade: '9-10', avg: 72, trend: '-0.5' }] },
      { key: 'exams', title: 'Exam Results (Aggregate)', type: 'bars', unit: '%', rows: [{ campusId: 'c1', label: 'North - Term 1 pass rate', value: 97 }, { campusId: 'c2', label: 'South - Term 1 pass rate', value: 93 }] },
    ] },
  { id: 'mgmt-operational', title: 'Operational Reports', subtitle: 'Attendance, staff and infrastructure with an exception dashboard.', campusScoped: true,
    stats: [{ label: 'Student attendance', value: '91.2%', tone: 'success' }, { label: 'Staff vacancies', value: '6', tone: 'warning' }, { label: 'Open exceptions', value: '3', tone: 'danger' }],
    sections: [
      { key: 'ops', title: 'Attendance, Staff, Infra', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'attendance', label: 'Attendance', type: 'percent' }, { key: 'staffing', label: 'Staffing', type: 'percent' }, { key: 'infra', label: 'Infra uptime', type: 'percent' }], rows: [{ campusId: 'c1', campus: 'North Campus', attendance: 93, staffing: 97, infra: 99 }, { campusId: 'c2', campus: 'South Campus', attendance: 89, staffing: 93, infra: 96 }] },
      { key: 'exceptions', title: 'Exception Dashboard', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'exception', label: 'Exception' }, { key: 'severity', label: 'Severity', type: 'badge' }, { key: 'since', label: 'Since' }], rows: [{ campusId: 'c2', campus: 'South Campus', exception: 'Attendance below 90% for Grade 9', severity: 'high', since: '5 days' }, { campusId: 'c2', campus: 'South Campus', exception: 'Two science posts vacant', severity: 'medium', since: '3 weeks' }, { campusId: 'c1', campus: 'North Campus', exception: 'Bus route 7 delays', severity: 'medium', since: '1 week' }] },
    ] },
  { id: 'mgmt-financial', title: 'Financial Management', subtitle: 'Fee collection, revenue and outstanding dues.', campusScoped: true,
    stats: [{ label: 'Collected', value: '₹3.42 Cr', tone: 'success' }, { label: 'Billed', value: '₹4.38 Cr', tone: 'info' }, { label: 'Outstanding', value: '₹0.96 Cr', tone: 'warning' }],
    sections: [
      { key: 'collection', title: 'Fee Collection Status', type: 'bars', unit: '%', rows: [{ campusId: 'c1', label: 'North Campus', value: 82 }, { campusId: 'c2', label: 'South Campus', value: 73 }] },
      { key: 'revenue', title: 'Revenue Reports', type: 'table', columns: [{ key: 'month', label: 'Month' }, { key: 'campus', label: 'Campus' }, { key: 'tuition', label: 'Tuition', type: 'currency' }, { key: 'transport', label: 'Transport', type: 'currency' }, { key: 'other', label: 'Other', type: 'currency' }], rows: [{ campusId: 'c1', month: 'August', campus: 'North Campus', tuition: 4820000, transport: 610000, other: 120000 }, { campusId: 'c2', month: 'August', campus: 'South Campus', tuition: 3510000, transport: 402000, other: 85000 }, { campusId: 'c1', month: 'September', campus: 'North Campus', tuition: 4910000, transport: 620000, other: 98000 }] },
      { key: 'dues', title: 'Outstanding Dues', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'bucket', label: 'Ageing' }, { key: 'accounts', label: 'Accounts' }, { key: 'amount', label: 'Amount', type: 'currency' }], rows: [{ campusId: 'c1', campus: 'North Campus', bucket: '0-30 days', accounts: 182, amount: 2950000 }, { campusId: 'c1', campus: 'North Campus', bucket: '30-90 days', accounts: 41, amount: 980000 }, { campusId: 'c2', campus: 'South Campus', bucket: '0-30 days', accounts: 210, amount: 3820000 }, { campusId: 'c2', campus: 'South Campus', bucket: '90+ days', accounts: 23, amount: 1850000 }] },
    ] },
  { id: 'mgmt-grievances', title: 'Grievance Overview', subtitle: 'High-level grievance summary across authorized campuses.', campusScoped: true,
    stats: [{ label: 'Open', value: '14', tone: 'warning' }, { label: 'Resolved (30d)', value: '52', tone: 'success' }, { label: 'Within SLA', value: '91%', tone: 'success' }, { label: 'Escalated', value: '2', tone: 'danger' }],
    sections: [
      { key: 'summary', title: 'High Level Summary', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'category', label: 'Category' }, { key: 'open', label: 'Open' }, { key: 'resolved', label: 'Resolved (30d)' }, { key: 'sla', label: 'Within SLA', type: 'percent' }], rows: [{ campusId: 'c1', campus: 'North Campus', category: 'Transport', open: 4, resolved: 11, sla: 88 }, { campusId: 'c1', campus: 'North Campus', category: 'Facilities', open: 3, resolved: 17, sla: 94 }, { campusId: 'c2', campus: 'South Campus', category: 'Academic', open: 5, resolved: 14, sla: 90 }, { campusId: 'c2', campus: 'South Campus', category: 'Fees', open: 2, resolved: 10, sla: 92 }] },
      { key: 'trend', title: 'Trend', type: 'bars', unit: ' new', rows: [{ label: 'June', value: 18 }, { label: 'July', value: 22 }, { label: 'August', value: 15 }, { label: 'September', value: 13 }] },
    ] },
  { id: 'mgmt-audit', title: 'Audit & Compliance', subtitle: 'Summary of logs and audits. Detailed records require additional authorization.', campusScoped: true,
    stats: [{ label: 'Sensitive actions (30d)', value: '1,284', tone: 'info' }, { label: 'Failed logins', value: '37', tone: 'warning' }, { label: 'Compliance checks passed', value: '18 / 19', tone: 'success' }],
    sections: [
      { key: 'logs', title: 'Logs & Audits (Summary)', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'category', label: 'Action category' }, { key: 'count', label: 'Events (30d)' }, { key: 'flagged', label: 'Flagged' }], rows: [{ campusId: 'c1', campus: 'North Campus', category: 'Result publication', count: 42, flagged: 0 }, { campusId: 'c1', campus: 'North Campus', category: 'Fee adjustments', count: 118, flagged: 2 }, { campusId: 'c2', campus: 'South Campus', category: 'Role changes', count: 9, flagged: 1 }, { campusId: 'c2', campus: 'South Campus', category: 'Data exports', count: 21, flagged: 0 }] },
      { key: 'compliance', title: 'Compliance Checks', type: 'table', columns: [{ key: 'check', label: 'Check' }, { key: 'status', label: 'Status', type: 'badge' }, { key: 'lastRun', label: 'Last run' }], rows: [{ check: 'MFA enforced for privileged roles', status: 'passed', lastRun: 'Today' }, { check: 'Session timeout configured', status: 'passed', lastRun: 'Today' }, { check: 'Data retention policy', status: 'failed', lastRun: 'Yesterday' }] },
    ] },
  { id: 'mgmt-custom-reports', title: 'Reports & Analytics', subtitle: 'Custom reports scoped to your campuses. Builder options are pending confirmation.', campusScoped: true,
    stats: [{ label: 'Saved reports', value: '6', tone: 'info' }],
    sections: [
      { key: 'attendance', title: 'Attendance by Campus', type: 'bars', unit: '%', rows: [{ campusId: 'c1', label: 'North Campus', value: 93 }, { campusId: 'c2', label: 'South Campus', value: 89 }] },
      { key: 'performance', title: 'Performance by Subject', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'subject', label: 'Subject' }, { key: 'avg', label: 'Avg.', type: 'percent' }], rows: [{ campusId: 'c1', campus: 'North Campus', subject: 'Mathematics', avg: 75 }, { campusId: 'c1', campus: 'North Campus', subject: 'Science', avg: 77 }, { campusId: 'c2', campus: 'South Campus', subject: 'Mathematics', avg: 71 }, { campusId: 'c2', campus: 'South Campus', subject: 'Science', avg: 74 }] },
      { key: 'fees', title: 'Fee Collection by Term', type: 'table', columns: [{ key: 'campus', label: 'Campus' }, { key: 'term', label: 'Term' }, { key: 'collected', label: 'Collected', type: 'percent' }], rows: [{ campusId: 'c1', campus: 'North Campus', term: 'Term 1', collected: 98 }, { campusId: 'c1', campus: 'North Campus', term: 'Term 2', collected: 66 }, { campusId: 'c2', campus: 'South Campus', term: 'Term 1', collected: 95 }, { campusId: 'c2', campus: 'South Campus', term: 'Term 2', collected: 51 }] },
    ] },
  // Phase 2 - Exam Controller
  ...[
    ['ec-programme', 'Exam Programme', 'Create programmes, define centres and map candidates.', [['programmes', 'Create Programme', [{ key: 'name', label: 'Programme' }, { key: 'window', label: 'Window' }, { key: 'status', label: 'Status', type: 'badge' }], [{ name: 'Term-End 2026', window: 'Nov 10 - Nov 24', status: 'scheduled' }, { name: 'Board Prep Mock', window: 'Dec 2 - Dec 6', status: 'draft' }]], ['centres', 'Define Centres', [{ key: 'centre', label: 'Centre' }, { key: 'capacity', label: 'Capacity' }], [{ centre: 'C-01 North Main Hall', capacity: 240 }, { centre: 'C-04 South Block A', capacity: 180 }]], ['mapping', 'Candidate Mapping', [{ key: 'grade', label: 'Grade' }, { key: 'candidates', label: 'Candidates' }, { key: 'mapped', label: 'Mapped', type: 'percent' }], [{ grade: '10', candidates: 412, mapped: 100 }, { grade: '12', candidates: 368, mapped: 94 }]]]],
    ['ec-questions', 'Question Bank', 'Moderated questions, blueprints and final approval.', [['moderated', 'Moderated Questions', [{ key: 'subject', label: 'Subject' }, { key: 'count', label: 'Moderated' }, { key: 'pending', label: 'Pending' }], [{ subject: 'Mathematics', count: 320, pending: 12 }, { subject: 'Science', count: 284, pending: 20 }]], ['blueprints', 'Blueprints', [{ key: 'paper', label: 'Paper' }, { key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' }], [{ paper: 'Grade 10 Maths', easy: '30%', medium: '50%', hard: '20%' }]], ['approval', 'Final Approval', [{ key: 'paper', label: 'Paper' }, { key: 'status', label: 'Status', type: 'badge' }], [{ paper: 'Grade 10 Maths - Set A', status: 'pending' }]]]],
    ['ec-paper', 'Paper Assembly', 'Generate, lock, encrypt and release papers.', [['generate', 'Generate & Lock Paper', [{ key: 'paper', label: 'Paper' }, { key: 'sets', label: 'Sets' }, { key: 'status', label: 'Lock status', type: 'badge' }], [{ paper: 'Grade 10 Maths', sets: 3, status: 'locked' }, { paper: 'Grade 10 Science', sets: 3, status: 'pending' }]], ['release', 'Encryption & Release', [{ key: 'paper', label: 'Paper' }, { key: 'releaseAt', label: 'Release at' }, { key: 'status', label: 'Status', type: 'badge' }], [{ paper: 'Grade 10 Maths', releaseAt: 'Nov 10, 08:30', status: 'scheduled' }]]]],
    ['ec-centres', 'Centre Management', 'Centre readiness and device/operator status.', [['readiness', 'Centre Readiness', [{ key: 'centre', label: 'Centre' }, { key: 'readiness', label: 'Readiness', type: 'percent' }, { key: 'status', label: 'Status', type: 'badge' }], [{ centre: 'C-01', readiness: 100, status: 'ready' }, { centre: 'C-06', readiness: 72, status: 'pending' }]], ['devices', 'Device / Operator Status', [{ key: 'centre', label: 'Centre' }, { key: 'devices', label: 'Devices online' }, { key: 'operators', label: 'Operators' }], [{ centre: 'C-01', devices: '48/48', operators: 6 }, { centre: 'C-06', devices: '30/36', operators: 3 }]]]],
    ['ec-dayops', 'Exam Day Operations', 'Paper release, incident handling, attendance and logs.', [['release', 'Release Paper', [{ key: 'paper', label: 'Paper' }, { key: 'status', label: 'Status', type: 'badge' }], [{ paper: 'Grade 10 Maths', status: 'scheduled' }]], ['incidents', 'Incident Handling', [{ key: 'centre', label: 'Centre' }, { key: 'incident', label: 'Incident' }, { key: 'status', label: 'Status', type: 'badge' }], []], ['attendance', 'Attendance & Logs', [{ key: 'centre', label: 'Centre' }, { key: 'present', label: 'Present' }, { key: 'absent', label: 'Absent' }], []]]],
    ['ec-evaluation', 'Evaluation & Moderation', 'Marking, moderation and result processing.', [['marking', 'Marking', [{ key: 'paper', label: 'Paper' }, { key: 'marked', label: 'Marked', type: 'percent' }], [{ paper: 'Grade 12 Physics', marked: 64 }]], ['moderation', 'Moderation', [{ key: 'paper', label: 'Paper' }, { key: 'sampled', label: 'Scripts sampled' }], [{ paper: 'Grade 12 Physics', sampled: 40 }]], ['processing', 'Result Processing', [{ key: 'batch', label: 'Batch' }, { key: 'status', label: 'Status', type: 'badge' }], [{ batch: 'Grade 12 - Term 1', status: 'pending' }]]]],
    ['ec-results', 'Results', 'Authorize and publish results; manage appeals.', [['authorize', 'Authorize & Publish', [{ key: 'batch', label: 'Batch' }, { key: 'status', label: 'Status', type: 'badge' }], [{ batch: 'Grade 10 - Term 1', status: 'released' }]], ['appeals', 'Appeals (if any)', [{ key: 'candidate', label: 'Candidate' }, { key: 'paper', label: 'Paper' }, { key: 'status', label: 'Status', type: 'badge' }], []]]],
    ['ec-audit', 'Audit Logs', 'Full traceability of exam operations.', [['trace', 'Full Traceability', [{ key: 'at', label: 'When' }, { key: 'who', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'item', label: 'Item' }, { key: 'where', label: 'Where' }], [{ at: 'Oct 10, 09:12', who: 'Leela George', action: 'LOCK', item: 'Grade 10 Maths - Set A', where: 'Exam cell' }]]]],
    ['ec-reports', 'Reports', 'Exam statistics and exception reports.', [['stats', 'Exam Statistics', [{ key: 'paper', label: 'Paper' }, { key: 'mean', label: 'Mean', type: 'percent' }, { key: 'pass', label: 'Pass rate', type: 'percent' }], [{ paper: 'Grade 10 Maths', mean: 71, pass: 94 }]], ['exceptions', 'Exception Reports', [{ key: 'exception', label: 'Exception' }, { key: 'count', label: 'Count' }], [{ exception: 'Late paper start', count: 1 }]]]],
  ].map(([id, title, subtitle, sections]) => ({
    id, title, subtitle, stats: [],
    sections: sections.map(([key, t, columns, rows]) => ({ key, title: t, type: 'table', columns, rows })),
  })),
];

const db = {
  config, tenants, campuses, subjects, classes, students, users, timetable,
  assignments, submissions, questions, exams, examAttempts, practiceSessions,
  attendance, notices, noticeAcks, threads, ptms, materials, performance,
  interventionPlans, complaints, fees, payments, requests, approvals,
  notifications, auditLogs, dashboards, insights, registrations: [],
};

module.exports = { db };

// `npm run mock:seed` writes the file; `require('./seed')` just returns the data.
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2));
  console.log(`[mock-api] db.json seeded with ${Object.keys(db).length} collections. Demo password: ${PASSWORD}`);
}
