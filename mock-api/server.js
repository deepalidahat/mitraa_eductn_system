/**
 * MiTRAA-Edu mock API (json-server 0.17).
 *
 * json-server provides REST CRUD for every collection in db.json under /api.
 * This file layers on what a real backend must own, so the frontend can be built against it:
 *   - auth: login (with "login as" context), OTP / MFA challenge, forgot password, registration
 *   - bearer-token sessions
 *   - Tenant -> Campus -> Class -> Relationship scoping on every read and write
 *   - permission checks on every mutation
 *   - workflow rules: exam window, result release, resubmission, payments flag, practice sharing
 *   - audit log for every mutation
 *
 * Demo OTP is 123456. Nothing here is secure; it only mimics backend contracts.
 */
const fs = require('fs');
const path = require('path');
const jsonServer = require('json-server');

const PORT = Number(process.env.PORT || 3000);
const LATENCY_MS = Number(process.env.LATENCY_MS || 250);
const DEMO_OTP = '123456';
const dbFile = path.join(__dirname, 'db.json');

if (!fs.existsSync(dbFile)) require('./seed');

const server = jsonServer.create();
const router = jsonServer.router(dbFile);
const db = router.db;

server.use(jsonServer.defaults({ logger: true, noCors: false }));
server.use(jsonServer.bodyParser);
server.use((req, res, next) => setTimeout(next, LATENCY_MS));

// ---------------------------------------------------------------- helpers
const cfg = () => db.get('config').value();
const fail = (res, status, message, extra = {}) => res.status(status).json({ message, ...extra });
const publicUser = ({ password, ...u }) => u;
const nowIso = () => new Date().toISOString();
const byId = (collection, id) => db.get(collection).find({ id }).value();

const issueToken = (user, remember) => {
  const ttl = remember ? 7 * 24 * 3600e3 : 12 * 3600e3;
  const expiresAt = Date.now() + ttl;
  const token = Buffer.from(JSON.stringify({ uid: user.id, exp: expiresAt })).toString('base64url');
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: publicUser(user) };
};

const readToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(header.slice(7), 'base64url').toString());
    if (Date.now() > exp) return null;
    return byId('users', uid) || null;
  } catch {
    return null;
  }
};

const can = (user, permission) => (user.permissions || []).includes(permission);
const roleLabel = {
  student: 'Student', teacher: 'Teacher / Staff', parent: 'Parent / Guardian',
  principal: 'Principal / HOD', management: 'Management / Trustee', examController: 'Exam Controller',
};

// ---------------------------------------------------------------- auth routes
const otpChallenges = new Map();

server.post('/api/auth/login', (req, res) => {
  const { identifier = '', password = '', loginAs, remember = false } = req.body || {};
  const id = String(identifier).trim().toLowerCase();
  const user = db.get('users').find((u) => u.email.toLowerCase() === id || u.userCode.toLowerCase() === id).value();

  if (!user || user.password !== password) return fail(res, 401, 'Invalid email / user ID or password.');
  if (loginAs && user.role !== loginAs) {
    return fail(res, 403, `This account is not registered as ${roleLabel[loginAs] || loginAs}. Please go back and choose the correct user type.`);
  }
  if (user.role === 'examController' && !cfg().phase2Enabled) {
    return fail(res, 403, 'Exam Controller access will be available in Phase 2.');
  }

  const { otpEnabled, mfaRoles = [], otpLength } = cfg();
  if (otpEnabled && (user.mfaEnabled || mfaRoles.includes(user.role))) {
    const challengeId = `otp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    otpChallenges.set(challengeId, { userId: user.id, remember, attemptsLeft: 5, expiresAt: Date.now() + 5 * 60e3 });
    const masked = user.email.replace(/^(.).*(@.*)$/, '$1•••••$2');
    return res.json({ mfaRequired: true, challengeId, otpLength, destination: masked, expiresInSec: 300 });
  }
  return res.json(issueToken(user, remember));
});

server.post('/api/auth/verify-otp', (req, res) => {
  const { challengeId, code } = req.body || {};
  const challenge = otpChallenges.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    otpChallenges.delete(challengeId);
    return fail(res, 410, 'This code has expired. Please sign in again.');
  }
  if (String(code) !== DEMO_OTP) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      otpChallenges.delete(challengeId);
      return fail(res, 429, 'Too many incorrect attempts. Please sign in again.');
    }
    return fail(res, 401, `Incorrect code. ${challenge.attemptsLeft} attempt(s) left.`, { attemptsLeft: challenge.attemptsLeft });
  }
  otpChallenges.delete(challengeId);
  return res.json(issueToken(byId('users', challenge.userId), challenge.remember));
});

server.post('/api/auth/resend-otp', (req, res) => {
  const challenge = otpChallenges.get((req.body || {}).challengeId);
  if (!challenge) return fail(res, 410, 'This code has expired. Please sign in again.');
  challenge.expiresAt = Date.now() + 5 * 60e3;
  return res.json({ expiresInSec: 300 });
});

server.post('/api/auth/forgot-password', (req, res) => {
  // Always the same answer so the endpoint does not reveal which accounts exist.
  res.json({ message: 'If an account matches, password reset instructions have been sent to the registered email.' });
});

server.post('/api/auth/register', (req, res) => {
  if (!cfg().registrationEnabled) return fail(res, 403, 'Registration is currently closed.');
  const { name, email, role } = req.body || {};
  if (!name || !email || !['student', 'parent'].includes(role)) return fail(res, 422, 'Name, email and a valid account type are required.');
  if (db.get('users').find((u) => u.email.toLowerCase() === String(email).toLowerCase()).value()) {
    return fail(res, 409, 'An account with this email already exists.');
  }
  if (!db.has('registrations').value()) db.set('registrations', []).write();
  const record = { id: `reg_${Date.now()}`, ...req.body, status: 'pending_verification', createdAt: nowIso() };
  db.get('registrations').push(record).write();
  return res.status(201).json({ message: 'Registration submitted. The school will verify your details and activate your account.' });
});

server.post('/api/auth/logout', (req, res) => res.status(204).end());

// ---------------------------------------------------------------- authentication gate
server.use('/api', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/config') return next();
  const user = readToken(req);
  if (!user) return fail(res, 401, 'Your session has expired. Please sign in again.');
  if (user.role === 'examController' && !cfg().phase2Enabled) return fail(res, 403, 'Phase 2 is not enabled.');
  req.user = user;
  next();
});

server.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));

// ---------------------------------------------------------------- scoping (Tenant -> Campus -> Class -> Relationship)
const classCampus = (classId) => (byId('classes', classId) || {}).campusId;
const studentOf = (studentId) => byId('students', studentId) || {};

/** Published, or scheduled with a publish time that has passed. */
const isLive = (assignment) =>
  assignment.status === 'published' || (assignment.status === 'scheduled' && !!assignment.publishAt && Date.parse(assignment.publishAt) <= Date.now());

const teacherStudentIds = (user) =>
  db.get('students').filter((s) => (user.classIds || []).includes(s.classId)).map('id').value();

function canSee(collection, row, user) {
  if (!row || typeof row !== 'object') return true;
  if (row.tenantId && row.tenantId !== user.tenantId) return false;
  const role = user.role;
  const campuses = user.campusIds || [];
  const rowCampus = row.campusId || (row.classId && classCampus(row.classId)) || (row.studentId && studentOf(row.studentId).campusId);

  // Collection-specific relationship rules
  switch (collection) {
    case 'users': return true;
    case 'notifications': return row.userId === user.id;
    case 'auditLogs': return ['principal', 'management'].includes(role) && campuses.includes(row.campusId);
    case 'threads': return row.participantIds.includes(user.id) || (role === 'principal' && campuses.includes(rowCampus));
    case 'ptms':
      if (role === 'parent') return row.parentId === user.id;
      if (role === 'teacher') return row.teacherId === user.id;
      if (role === 'student') return row.studentId === user.studentId;
      return campuses.includes(rowCampus);
    case 'complaints':
      if (['principal', 'management'].includes(role)) return campuses.includes(row.campusId);
      return row.raisedById === user.id;
    case 'notices': {
      const audienceOk = row.audience.includes(role) || can(user, 'notice:publish');
      const campusOk = row.campusIds.some((c) => campuses.includes(c));
      return audienceOk && campusOk && (row.status === 'published' || can(user, 'notice:publish'));
    }
    case 'approvals':
      if (role === 'principal') return row.level === 'campus' && campuses.includes(row.campusId);
      if (role === 'management') return campuses.includes(row.campusId);
      return false;
    case 'questions': return role === 'student' ? row.status === 'approved' : ['teacher', 'principal', 'examController'].includes(role);
    case 'practiceSessions':
      if (role === 'parent') return (user.childIds || []).includes(row.studentId) && row.sharedWithParent;
      break;
    case 'interventionPlans':
      if (role === 'parent') return (user.childIds || []).includes(row.studentId) && row.sharedWithParent;
      break;
    case 'assignments':
      if (['student', 'parent'].includes(role) && !isLive(row)) return false;
      break;
    case 'exams':
      if (['student', 'parent'].includes(role) && row.status === 'draft') return false;
      break;
    default:
  }

  // Generic relationship rules by row shape
  if (row.studentId) {
    if (role === 'student') return row.studentId === user.studentId;
    if (role === 'parent') return (user.childIds || []).includes(row.studentId);
    if (role === 'teacher') return teacherStudentIds(user).includes(row.studentId);
  }
  if (row.classId) {
    if (role === 'student') return row.classId === user.classId;
    if (role === 'parent') return (user.childIds || []).some((id) => studentOf(id).classId === row.classId);
    if (role === 'teacher') return (user.classIds || []).includes(row.classId);
  }
  if (collection === 'students') {
    if (role === 'student') return row.id === user.studentId;
    if (role === 'parent') return (user.childIds || []).includes(row.id);
    if (role === 'teacher') return (user.classIds || []).includes(row.classId);
  }
  if (rowCampus && ['principal', 'management', 'examController'].includes(role)) return campuses.includes(rowCampus);
  return true;
}

/** Shapes a visible row for the viewer (hides answers, unreleased marks, passwords). */
function present(collection, row, user) {
  if (collection === 'users') return publicUser(row);
  if (collection === 'questions' && user.role === 'student') {
    const { answerIndex, explanation, ...rest } = row;
    return rest;
  }
  if (collection === 'examAttempts' && ['student', 'parent'].includes(user.role)) {
    const exam = byId('exams', row.examId) || {};
    if (exam.resultStatus !== 'released') {
      const { marks, remarks, autoMarks, ...rest } = row;
      return { ...rest, marks: null, remarks: null, resultHidden: true };
    }
  }
  if (collection === 'attendance' && ['student', 'parent'].includes(user.role)) {
    const mine = user.role === 'student' ? [user.studentId] : user.childIds || [];
    return { ...row, records: row.records.filter((r) => mine.includes(r.studentId)) };
  }
  return row;
}

const collectionOf = (req) => req.originalUrl.split('?')[0].replace(/^\/api\//, '').split('/');

router.render = (req, res) => {
  const [collection] = collectionOf(req);
  let data = res.locals.data;
  const user = req.user;
  if (user && Array.isArray(data)) {
    data = data.filter((row) => canSee(collection, row, user)).map((row) => present(collection, row, user));
    if (res.get('X-Total-Count')) res.set('X-Total-Count', String(data.length));
  } else if (user && data && typeof data === 'object' && data.id !== undefined) {
    if (req.method === 'GET' && !canSee(collection, data, user)) return fail(res, 404, 'Not found.');
    data = present(collection, data, user);
  }
  res.jsonp(data);
};

// ---------------------------------------------------------------- custom endpoints
server.post('/api/practice/generate', (req, res) => {
  if (!can(req.user, 'practice:use')) return fail(res, 403, 'You do not have access to PracticePod.');
  const { grade, subjectId, chapter, count = 5 } = req.body || {};
  const pool = db.get('questions')
    .filter((q) => q.tenantId === req.user.tenantId && q.status === 'approved' && q.subjectId === subjectId && (!chapter || q.chapter === chapter) && (!grade || q.grade === Number(grade)))
    .shuffle().take(Math.min(Number(count) || 5, 20)).value();
  if (!pool.length) return fail(res, 404, 'No approved practice questions for this selection yet.');
  res.json({ grade: Number(grade), subjectId, chapter, questions: pool.map((q) => present('questions', q, req.user)) });
});

server.get('/api/practice/chapters', (req, res) => {
  const rows = db.get('questions').filter({ tenantId: req.user.tenantId, status: 'approved' }).value();
  const map = {};
  rows.forEach((q) => {
    const key = `${q.grade}|${q.subjectId}`;
    map[key] = Array.from(new Set([...(map[key] || []), q.chapter]));
  });
  res.json(Object.entries(map).map(([key, chapters]) => {
    const [grade, subjectId] = key.split('|');
    return { grade: Number(grade), subjectId, chapters };
  }));
});

// ---------------------------------------------------------------- mutation rules
const needs = (permission) => (user) => can(user, permission);
const any = (...perms) => (user) => perms.some((p) => can(user, p));

/** Who may create (POST) or update (PATCH/PUT) each collection. Anything unlisted is read-only. */
const writeRules = {
  assignments: { POST: needs('assignment:manage'), PATCH: needs('assignment:manage') },
  submissions: { POST: needs('assignment:submit'), PATCH: any('assignment:manage') },
  exams: { POST: needs('exam:manage'), PATCH: any('exam:manage', 'paper:approve', 'results:release') },
  examAttempts: { POST: needs('exam:attempt'), PATCH: needs('exam:manage') },
  questions: { POST: needs('question:manage'), PATCH: needs('question:manage') },
  attendance: { POST: needs('attendance:mark'), PATCH: needs('attendance:mark') },
  notices: { POST: needs('notice:publish'), PATCH: needs('notice:publish') },
  noticeAcks: { POST: any('notice:ack', 'complaint:create') },
  threads: { POST: any('message:send', 'parent:communicate'), PATCH: any('message:send', 'parent:communicate', 'complaint:manage') },
  ptms: { POST: needs('ptm:book'), PATCH: any('ptm:book', 'parent:communicate') },
  complaints: { POST: needs('complaint:create'), PATCH: any('complaint:create', 'complaint:manage') },
  payments: { POST: needs('payment:make') },
  requests: { POST: needs('request:create') },
  approvals: { PATCH: needs('approval:decide') },
  interventionPlans: { POST: needs('support:manage'), PATCH: needs('support:manage') },
  practiceSessions: { POST: needs('practice:use'), PATCH: needs('practice:use') },
  notifications: { PATCH: () => true },
  users: { PATCH: () => true },
};

server.use('/api', (req, res, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const [collection, id] = collectionOf(req);
  const method = req.method === 'PUT' ? 'PATCH' : req.method;
  const rule = (writeRules[collection] || {})[method];
  const user = req.user;
  if (!rule || !rule(user)) return fail(res, 403, 'You do not have permission to perform this action.');

  const body = req.body || {};
  const existing = id ? byId(collection, id) : null;
  if (id && (!existing || !canSee(collection, existing, user))) return fail(res, 404, 'Not found.');

  // Server-owned fields
  delete body.id;
  body.tenantId = user.tenantId;

  const violation = applyWorkflowRules(collection, method, body, existing, user);
  if (violation) return fail(res, violation.status, violation.message);

  const action = body.__auditAction || method;
  delete body.__auditAction;
  res.on('finish', () => {
    if (res.statusCode < 400) {
      db.get('auditLogs').push({
        id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, tenantId: user.tenantId, at: nowIso(),
        actorName: user.name, actorRole: user.role, action, resource: collection,
        resourceId: id || null, campusId: (user.campusIds || [])[0], ip: req.ip,
      }).write();
    }
  });
  next();
});

function applyWorkflowRules(collection, method, body, existing, user) {
  const sid = user.studentId;
  switch (collection) {
    case 'submissions': {
      if (method === 'POST') {
        const assignment = byId('assignments', body.assignmentId);
        if (!assignment || !isLive(assignment) || assignment.classId !== user.classId) return { status: 404, message: 'Assignment not found.' };
        const previous = db.get('submissions').filter({ assignmentId: assignment.id, studentId: sid }).value();
        if (previous.length && !assignment.allowResubmit) return { status: 409, message: 'Resubmission is not allowed for this assignment.' };
        Object.assign(body, { studentId: sid, submittedAt: nowIso(), attempt: previous.length + 1, status: 'submitted', marks: null, feedback: null, evaluatedAt: null });
      } else {
        Object.assign(body, { evaluatedAt: body.status === 'evaluated' ? nowIso() : existing.evaluatedAt });
        body.__auditAction = 'EVALUATE';
      }
      return null;
    }
    case 'examAttempts': {
      if (method === 'POST') {
        const exam = byId('exams', body.examId);
        if (!exam || exam.classId !== user.classId || exam.status === 'draft') return { status: 404, message: 'Exam not found.' };
        const now = Date.now();
        if (now < Date.parse(exam.startAt) || now > Date.parse(exam.endAt)) return { status: 403, message: 'This exam is not open for attempts right now.' };
        if (db.get('examAttempts').find({ examId: exam.id, studentId: sid }).value()) return { status: 409, message: 'You have already submitted this exam.' };
        const answers = Array.isArray(body.answers) ? body.answers : [];
        const autoMarks = exam.questionIds.reduce((sum, qid, i) => {
          const q = byId('questions', qid);
          return sum + (q && q.answerIndex === answers[i] ? q.marks : 0);
        }, 0);
        Object.assign(body, { studentId: sid, answers, autoMarks, marks: null, remarks: null, status: 'submitted', submittedAt: nowIso() });
      } else {
        body.__auditAction = 'MARK';
      }
      return null;
    }
    case 'exams': {
      if (method === 'POST') {
        Object.assign(body, { createdBy: user.id, paperApproval: 'pending', resultStatus: 'pending', status: body.status || 'draft' });
        return null;
      }
      if ('paperApproval' in body && !can(user, 'paper:approve')) return { status: 403, message: 'Only authorized roles can approve papers.' };
      if (body.resultStatus === 'released') {
        if (!can(user, 'results:release')) return { status: 403, message: 'Results can only be released after approval by an authorized role.' };
        body.__auditAction = 'RELEASE_RESULTS';
      }
      if (body.status === 'published' && existing.paperApproval !== 'approved' && body.paperApproval !== 'approved') {
        return { status: 409, message: 'The paper must be approved before the exam can be published.' };
      }
      return null;
    }
    case 'assignments':
      if (method === 'POST') Object.assign(body, { teacherId: user.id, createdAt: nowIso() });
      if (body.status === 'published' && !body.publishAt) body.publishAt = nowIso();
      if (body.status === 'published') body.__auditAction = 'PUBLISH';
      return null;
    case 'questions':
      if (method === 'POST') Object.assign(body, { createdBy: user.id, status: body.status || 'draft' });
      return null;
    case 'attendance':
      if (!(user.classIds || []).includes(body.classId || existing?.classId)) return { status: 403, message: 'You can only mark attendance for your own classes.' };
      Object.assign(body, { markedBy: user.id, markedAt: nowIso() });
      return null;
    case 'notices':
      if (body.status === 'published') Object.assign(body, { publishedAt: nowIso(), publishedBy: user.name, __auditAction: 'PUBLISH' });
      if (method === 'POST') body.campusIds = body.campusIds?.length ? body.campusIds.filter((c) => user.campusIds.includes(c)) : user.campusIds;
      return null;
    case 'noticeAcks':
      if (db.get('noticeAcks').find({ noticeId: body.noticeId, userId: user.id }).value()) return { status: 409, message: 'Already acknowledged.' };
      Object.assign(body, { userId: user.id, at: nowIso() });
      return null;
    case 'threads':
      if (method === 'POST') {
        if (user.role === 'parent' && !(user.childIds || []).includes(body.studentId)) return { status: 403, message: 'You can only message about your own child.' };
        Object.assign(body, { createdBy: user.id, participantIds: Array.from(new Set([user.id, ...(body.participantIds || [])])), status: 'open', updatedAt: nowIso() });
      } else {
        body.updatedAt = nowIso();
      }
      return null;
    case 'ptms':
      if (method === 'POST') {
        if (!(user.childIds || []).includes(body.studentId)) return { status: 403, message: 'You can only request a PTM for your own child.' };
        Object.assign(body, { parentId: user.id, parentName: user.name, status: 'requested', requestedAt: nowIso(), notes: null, actionPlan: null });
      }
      if (user.role === 'parent' && method === 'PATCH') {
        const allowed = ['actionPlanAck', 'followUp'];
        Object.keys(body).forEach((k) => { if (!allowed.includes(k) && k !== 'tenantId') delete body[k]; });
      }
      return null;
    case 'complaints': {
      if (method === 'POST') {
        const owners = { Academic: 'Academic Coordinator', Transport: 'Transport Coordinator', Facilities: 'Facilities Manager', Fees: 'Accounts Office', Safety: 'Principal', Other: 'Admin Office' };
        const ownerName = owners[body.category] || owners.Other;
        const created = nowIso();
        Object.assign(body, {
          trackingId: `GRV-${String(Date.now()).slice(-6)}`, raisedById: user.id, raisedByName: user.name, raisedByRole: user.role,
          campusId: (user.campusIds || [])[0], status: 'assigned', ownerName, escalated: false, createdAt: created,
          slaDueAt: new Date(Date.now() + 72 * 3600e3).toISOString(),
          timeline: [{ at: created, status: 'open', note: 'Complaint submitted' }, { at: created, status: 'assigned', note: `Assigned to ${ownerName} (SLA 72h)` }],
        });
        return null;
      }
      if (!can(user, 'complaint:manage')) {
        if (existing.raisedById !== user.id || body.status !== 'reopened' || !['resolved', 'closed'].includes(existing.status)) {
          return { status: 403, message: 'You can only reopen your own resolved complaints.' };
        }
      }
      body.timeline = [...existing.timeline, { at: nowIso(), status: body.status || (body.escalated ? 'escalated' : existing.status), note: body.note || 'Updated' }];
      delete body.note;
      return null;
    }
    case 'payments': {
      if (!cfg().paymentsEnabled) return { status: 403, message: 'Online payment is not enabled for your school.' };
      const fee = byId('fees', body.feeId);
      if (!fee || !(user.childIds || []).includes(fee.studentId)) return { status: 404, message: 'Fee not found.' };
      const amount = Number(body.amount);
      const due = fee.amount - fee.paid;
      if (!(amount > 0) || amount > due) return { status: 422, message: `Amount must be between 1 and ${due}.` };
      Object.assign(body, { studentId: fee.studentId, amount, status: 'success', reference: `TXN${Date.now().toString().slice(-8)}`, paidAt: nowIso() });
      const paid = fee.paid + amount;
      db.get('fees').find({ id: fee.id }).assign({ paid, status: paid >= fee.amount ? 'paid' : 'partial' }).write();
      return null;
    }
    case 'requests':
      if (!(user.childIds || []).includes(body.studentId)) return { status: 403, message: 'You can only raise requests for your own child.' };
      Object.assign(body, { parentId: user.id, status: 'pending', createdAt: nowIso(), decisionNote: null });
      return null;
    case 'approvals':
      Object.assign(body, { decidedBy: user.name, decidedAt: nowIso(), __auditAction: String(body.status || 'DECIDE').toUpperCase() });
      if (existing.refType === 'exam' && ['approved', 'rejected'].includes(body.status)) {
        db.get('exams').find({ id: existing.refId }).assign({ paperApproval: body.status }).write();
      }
      return null;
    case 'interventionPlans':
      if (method === 'POST') Object.assign(body, { createdBy: user.id, status: 'active' });
      return null;
    case 'practiceSessions': {
      if (method === 'PATCH') {
        if (existing.studentId !== sid) return { status: 403, message: 'Not your practice session.' };
        Object.keys(body).forEach((k) => { if (!['sharedWithParent', 'tenantId'].includes(k)) delete body[k]; });
        return null;
      }
      const ids = Array.isArray(body.questionIds) ? body.questionIds : [];
      const answers = Array.isArray(body.answers) ? body.answers : [];
      let score = 0;
      let total = 0;
      const review = ids.map((qid, i) => {
        const q = byId('questions', qid) || {};
        total += q.marks || 0;
        if (q.answerIndex === answers[i]) score += q.marks || 0;
        return { questionId: qid, correctIndex: q.answerIndex, explanation: q.explanation };
      });
      Object.assign(body, { studentId: sid, score, total, review, completedAt: nowIso(), sharedWithParent: !!body.sharedWithParent });
      return null;
    }
    case 'notifications':
      if (existing.userId !== user.id) return { status: 404, message: 'Not found.' };
      return null;
    case 'users':
      if (existing.id !== user.id) return { status: 403, message: 'You can only update your own profile.' };
      Object.keys(body).forEach((k) => { if (!['name', 'phone', 'language', 'tenantId'].includes(k)) delete body[k]; });
      delete body.tenantId;
      return null;
    default:
      return null;
  }
}

server.use('/api', router);

server.listen(PORT, () => {
  console.log(`[mock-api] MiTRAA-Edu mock API on http://localhost:${PORT}/api  (demo OTP ${DEMO_OTP})`);
});
