const router = require('express').Router();
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { canAccessModule } = require('../config/permissions');
const {
  User, Employee, Task, TaskProgressUpdate, TaskTimeLog, Project, Attendance,
  TaskSubtask, TaskMessage, TaskMessageAttachment,
} = require('../models/associations');
const { notifyEmployee } = require('../utils/notify');
const {
  TIMEZONE, WORK_HOURS_PER_DAY, todayStr, isValidDateStr, shiftDay, dayBounds,
  minutesBetween, truncate,
} = require('../utils/taskTime');

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const MANAGE_ROLES = ['superadmin', 'admin', 'manager', 'hr'];
const MAX_RANGE_DAYS = 62;
const SUBTASK_STATUSES = ['To Do', 'In Progress', 'Done'];

const safeNotify = async (...args) => { try { await notifyEmployee(...args); } catch (e) { /* ignore */ } };
const localDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TIMEZONE });

const uploadDir = path.join(__dirname, '../uploads/tasks');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadTaskFiles = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

async function syncTaskVariance(task, transaction) {
  if (!task.estimatedMinutes) {
    task.timeSavedSeconds = null;
    task.timeOverrunSeconds = null;
    return;
  }
  const logs = await TaskTimeLog.findAll({ where: { taskId: task.id }, transaction });
  const now = new Date();
  const workedSeconds = logs.reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt || now) - new Date(l.startedAt)) / 1000)), 0);
  const allotted = task.estimatedMinutes * 60;
  if (workedSeconds > allotted) {
    task.timeOverrunSeconds = workedSeconds - allotted;
    task.timeSavedSeconds = null;
  } else {
    task.timeSavedSeconds = allotted - workedSeconds;
    task.timeOverrunSeconds = null;
  }
}

/* ---------- Actor + permission ---------- */

router.use(auth, async (req, res, next) => {
  try {
    let actor = { id: null, name: 'Superadmin', role: req.user.role, roles: [req.user.role] };
    if (req.user.id !== 'temp-superadmin') {
      const u = await User.findByPk(req.user.id);
      if (!u) return res.status(401).json({ message: 'User not found' });
      let roles = u.roles;
      if (typeof roles === 'string') { try { roles = JSON.parse(roles); } catch (e) { roles = [roles]; } }
      if (!Array.isArray(roles) || !roles.length) roles = [u.role];
      actor = { id: u.id, name: u.name || u.username || 'Admin', role: u.role, roles };
    }
    // HRM holders, or users explicitly granted the Tasks & Work Log section.
    const access = { role: actor.role, roles: actor.roles, modules: req.user.modules };
    if (!canAccessModule(access, 'hrm') && !canAccessModule(access, 'tasks')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    actor.canManage = actor.roles.some((r) => MANAGE_ROLES.includes(r));
    req.actor = actor;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const requireManage = (req, res, next) =>
  (req.actor.canManage ? next() : res.status(403).json({ message: 'You do not have permission to manage tasks' }));

/* ---------- Overview (live) ---------- */

router.get('/overview', async (req, res) => {
  try {
    const date = todayStr();
    const { start, end } = dayBounds(date);
    const now = new Date();
    const employees = await Employee.findAll({
      where: { status: 'Active' },
      attributes: ['id', 'name', 'code', 'designation', 'department'],
      order: [['name', 'ASC']],
    });
    const ids = employees.map((e) => e.id);
    if (!ids.length) return res.json({ date, employees: [], totals: {} });

    const [att, logs, openTasks] = await Promise.all([
      Attendance.findAll({ where: { employeeId: ids, date }, order: [['id', 'DESC']] }),
      TaskTimeLog.findAll({
        where: { employeeId: ids, [Op.or]: [{ endedAt: null }, { startedAt: { [Op.gte]: start, [Op.lt]: end } }] },
        include: [{ model: Task, as: 'task', attributes: ['id', 'title', 'estimatedMinutes', 'progress'] }],
      }),
      Task.findAll({
        where: { assignedTo: ids, status: { [Op.notIn]: ['Done', 'Cancelled'] } },
        attributes: ['id', 'assignedTo', 'title', 'status', 'progress', 'dueDate', 'priority', 'estimatedMinutes'],
        include: [{ model: TaskSubtask, as: 'subtasks', attributes: ['id', 'isCompleted'] }],
      }),
    ]);

    const rows = employees.map((e) => {
      const a = att.filter((r) => r.employeeId === e.id);
      const status = a[0]?.status || null;
      const checkInAt = a.map((r) => r.checkInAt).filter(Boolean).sort((x, y) => x - y)[0] || null;
      const checkOutAt = a.map((r) => r.checkOutAt).filter(Boolean).sort((x, y) => y - x)[0] || null;
      const mine = logs.filter((l) => l.employeeId === e.id);
      const running = mine.find((l) => !l.endedAt);
      const todayLogs = mine.filter((l) => new Date(l.startedAt) >= start);
      const workedMinutes = todayLogs.reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);
      let idleMinutes = null;
      if (status === 'Present') {
        const span = checkInAt
          ? minutesBetween(checkInAt, checkOutAt || now)
          : WORK_HOURS_PER_DAY * 60;
        idleMinutes = Math.max(0, span - workedMinutes);
      }
      const tasks = openTasks.filter((t) => t.assignedTo === e.id);
      let currentTask = null;
      if (running) {
        const prior = mine.filter((l) => l.taskId === running.taskId && l.endedAt)
          .reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 1000)), 0);
        const task = openTasks.find((t) => t.id === running.taskId);
        currentTask = {
          id: running.task?.id,
          title: running.task?.title,
          since: running.startedAt,
          estimatedMinutes: running.task?.estimatedMinutes,
          progress: running.task?.progress,
          priorWorkedSeconds: prior,
          subtasksTotal: task?.subtasks?.length || 0,
          subtasksDone: task?.subtasks?.filter((s) => s.isCompleted).length || 0,
        };
      }
      return {
        ...e.toJSON(),
        attendance: status,
        checkInAt, checkOutAt,
        currentTask,
        workedMinutes, idleMinutes,
        openTasks: tasks.length,
        overdueTasks: tasks.filter((t) => t.dueDate && t.dueDate < date).length,
        tasks,
      };
    });

    res.json({
      date,
      employees: rows.filter((r) => r.currentTask), // only show currently working
      totals: {
        present: rows.filter((r) => r.attendance === 'Present').length,
        working: rows.filter((r) => r.currentTask).length,
        openTasks: openTasks.length,
        overdue: rows.reduce((s, r) => s + r.overdueTasks, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Work-log report ---------- */

async function buildReport(query) {
  const from = isValidDateStr(query.from) ? query.from : todayStr();
  const to = isValidDateStr(query.to) ? query.to : from;
  if (to < from) throw Object.assign(new Error('To date cannot be before From date'), { status: 400 });
  if ((new Date(to) - new Date(from)) / 86400000 > MAX_RANGE_DAYS) {
    throw Object.assign(new Error(`Date range is limited to ${MAX_RANGE_DAYS} days`), { status: 400 });
  }
  const empWhere = { status: 'Active' };
  if (query.employeeId) empWhere.id = Number(query.employeeId);
  const employees = await Employee.findAll({ where: empWhere, attributes: ['id', 'name', 'code'], order: [['name', 'ASC']] });
  const ids = employees.map((e) => e.id);

  const rangeStart = dayBounds(from).start;
  const rangeEnd = dayBounds(to).end;
  const now = new Date();
  const [logs, att] = ids.length ? await Promise.all([
    TaskTimeLog.findAll({
      where: { employeeId: ids, startedAt: { [Op.gte]: rangeStart, [Op.lt]: rangeEnd } },
      include: [{ model: Task, as: 'task', attributes: ['id', 'title', 'status', 'progress', 'estimatedMinutes'] }],
      order: [['startedAt', 'ASC']],
    }),
    Attendance.findAll({ where: { employeeId: ids, date: { [Op.between]: [from, to] } }, order: [['id', 'DESC']] }),
  ]) : [[], []];

  const days = [];
  for (const e of employees) {
    for (let d = from; d <= to; d = shiftDay(d, 1)) {
      const a = att.filter((r) => r.employeeId === e.id && r.date === d);
      const dayLogs = logs.filter((l) => l.employeeId === e.id && localDay(l.startedAt) === d);
      if (!a.length && !dayLogs.length) continue;
      const status = a[0]?.status || null;
      const checkInAt = a.map((r) => r.checkInAt).filter(Boolean).sort((x, y) => x - y)[0] || null;
      const checkOutAt = a.map((r) => r.checkOutAt).filter(Boolean).sort((x, y) => y - x)[0] || null;
      const workedMinutes = dayLogs.reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);
      let spanMinutes = null;
      let basis = 'none';
      if (status === 'Present') {
        if (checkInAt) {
          const stop = checkOutAt || (d === todayStr() ? now : new Date(new Date(checkInAt).getTime() + WORK_HOURS_PER_DAY * 3600000));
          spanMinutes = minutesBetween(checkInAt, stop);
          basis = 'checkin';
        } else { spanMinutes = WORK_HOURS_PER_DAY * 60; basis = 'default'; }
      }
      days.push({
        employeeId: e.id, name: e.name, code: e.code, date: d, status,
        checkInAt, checkOutAt, workedMinutes, spanMinutes, basis,
        idleMinutes: spanMinutes === null ? null : Math.max(0, spanMinutes - workedMinutes),
        manualMinutes: dayLogs.filter((l) => l.source === 'manual').reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0),
        entries: dayLogs.length,
      });
    }
  }

  const byTask = {};
  logs.forEach((l) => {
    const k = `${l.employeeId}-${l.taskId}`;
    const emp = employees.find((e) => e.id === l.employeeId);
    byTask[k] = byTask[k] || {
      employeeId: l.employeeId, name: emp?.name, taskId: l.taskId, title: l.task?.title,
      status: l.task?.status, progress: l.task?.progress, estimatedMinutes: l.task?.estimatedMinutes, workedMinutes: 0,
    };
    byTask[k].workedMinutes += minutesBetween(l.startedAt, l.endedAt || now);
  });

  const summary = days.reduce((s, d) => ({
    workedMinutes: s.workedMinutes + d.workedMinutes,
    idleMinutes: s.idleMinutes + (d.idleMinutes || 0),
  }), { workedMinutes: 0, idleMinutes: 0 });

  return { from, to, days, tasks: Object.values(byTask), summary };
}

router.get('/worklog/report', async (req, res) => {
  try {
    res.json(await buildReport(req.query));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.get('/worklog/export', async (req, res) => {
  try {
    const r = await buildReport(req.query);
    const hm = (m) => (m == null ? '' : `${Math.floor(m / 60)}h ${m % 60}m`);
    const tm = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }) : '');
    const daily = r.days.map((d) => ({
      Employee: d.name, Code: d.code, Date: d.date, Attendance: d.status || '',
      'Check in': tm(d.checkInAt), 'Check out': tm(d.checkOutAt),
      'Worked (h)': +(d.workedMinutes / 60).toFixed(2),
      'Idle (h)': d.idleMinutes == null ? '' : +(d.idleMinutes / 60).toFixed(2),
      'Idle basis': d.basis === 'default' ? `assumed ${WORK_HOURS_PER_DAY}h day` : d.basis === 'checkin' ? 'check-in/out' : '',
      'Manual (h)': +(d.manualMinutes / 60).toFixed(2),
    }));
    const tasks = r.tasks.map((t) => ({
      Employee: t.name, Task: t.title, Status: t.status, 'Progress %': t.progress,
      'Estimated': hm(t.estimatedMinutes), 'Worked': hm(t.workedMinutes),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(daily), 'Daily');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks), 'By Task');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="work-log-${r.from}_${r.to}.xlsx"`);
    res.send(buf);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ---------- Time-log edits (admin) ---------- */

router.patch('/logs/:id', requireManage, async (req, res) => {
  try {
    const log = await TaskTimeLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Entry not found' });
    const start = req.body.startedAt ? new Date(req.body.startedAt) : log.startedAt;
    const end = req.body.endedAt ? new Date(req.body.endedAt) : log.endedAt;
    if (isNaN(start) || (end && isNaN(end))) return res.status(400).json({ message: 'Invalid time' });
    if (end && end <= start) return res.status(400).json({ message: 'End must be after start' });
    log.startedAt = start;
    log.endedAt = end;
    if (req.body.note !== undefined) log.note = String(req.body.note).slice(0, 500);
    log.note = truncate(`${log.note || ''}`.replace(/\s*\[edited by .*\]$/, '') + ` [edited by ${req.actor.name}]`, 500);
    await log.save();
    const task = await Task.findByPk(log.taskId);
    if (task) {
      await syncTaskVariance(task);
      await task.save();
    }
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/logs/:id', requireManage, async (req, res) => {
  try {
    const log = await TaskTimeLog.findByPk(req.params.id);
    const n = await TaskTimeLog.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Entry not found' });
    if (log) {
      const task = await Task.findByPk(log.taskId);
      if (task) {
        await syncTaskVariance(task);
        await task.save();
      }
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Tasks CRUD ---------- */

router.get('/', async (req, res) => {
  try {
    const { status, employeeId, projectId, q, overdue } = req.query;
    const where = {};
    if (status === 'open') where.status = { [Op.notIn]: ['Done', 'Cancelled'] };
    else if (STATUSES.includes(status)) where.status = status;
    if (employeeId) where.assignedTo = Number(employeeId);
    if (projectId) where.projectId = Number(projectId);
    if (q) where.title = { [Op.like]: `%${q}%` };
    if (overdue === '1') {
      where.dueDate = { [Op.lt]: todayStr() };
      where.status = { [Op.notIn]: ['Done', 'Cancelled'] };
    }
    const tasks = await Task.findAll({
      where,
      include: [
        { model: Employee, as: 'assignee', attributes: ['id', 'name', 'code'] },
        { model: Project, as: 'project', attributes: ['id', 'name'], required: false },
        { model: TaskSubtask, as: 'subtasks', attributes: ['id', 'isCompleted'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    const logs = tasks.length ? await TaskTimeLog.findAll({ where: { taskId: tasks.map((t) => t.id) } }) : [];
    const now = new Date();
    res.json(tasks.map((t) => {
      const workedMinutes = logs.filter((l) => l.taskId === t.id).reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);
      const subs = t.subtasks || [];
      return {
        ...t.toJSON(),
        workedMinutes,
        subtasksTotal: subs.length,
        subtasksDone: subs.filter((s) => s.isCompleted).length,
        overrunSeconds: t.timeOverrunSeconds || 0,
        savedSeconds: t.timeSavedSeconds || 0,
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requireManage, async (req, res) => {
  try {
    const { title, description, projectId, priority, dueDate, estimatedMinutes, subtasks } = req.body;
    const list = [].concat(req.body.assignedTo ?? req.body.employeeIds ?? []).map(Number).filter(Boolean);
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
    if (!list.length) return res.status(400).json({ message: 'Select at least one employee' });
    if (dueDate && !isValidDateStr(dueDate)) return res.status(400).json({ message: 'Invalid due date' });

    const emps = await Employee.findAll({ where: { id: list, status: 'Active' }, attributes: ['id'] });
    if (!emps.length) return res.status(400).json({ message: 'No active employees selected' });

    const created = [];
    for (const e of emps) {
      const task = await Task.create({
        title: String(title).trim().slice(0, 200),
        description: description || '',
        projectId: projectId || null,
        assignedTo: e.id,
        createdByType: 'admin',
        createdById: req.actor.id,
        createdByName: req.actor.name,
        priority: PRIORITIES.includes(priority) ? priority : 'Medium',
        dueDate: dueDate || null,
        estimatedMinutes: Number(estimatedMinutes) > 0 ? Math.round(Number(estimatedMinutes)) : null,
      });
      if (Array.isArray(subtasks) && subtasks.length) {
        await TaskSubtask.bulkCreate(
          subtasks.filter(Boolean).map((st, i) => ({
            taskId: task.id,
            title: String(st).trim().slice(0, 250),
            createdByType: 'admin',
            createdById: req.actor.id,
            createdByName: req.actor.name,
            sortOrder: i,
          }))
        );
      }
      created.push(task);
      await safeNotify(e.id, 'TaskAssigned', truncate(`New task assigned: ${task.title}`, 250), 'Task', task.id);
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'assignee', attributes: ['id', 'name', 'code'] },
        { model: Project, as: 'project', attributes: ['id', 'name'], required: false },
        { model: TaskSubtask, as: 'subtasks', order: [['sortOrder', 'ASC'], ['id', 'ASC']] },
        { model: TaskMessage, as: 'messages', include: [{ model: TaskMessageAttachment, as: 'attachments' }], order: [['createdAt', 'ASC']] },
      ],
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const [logs, updates] = await Promise.all([
      TaskTimeLog.findAll({ where: { taskId: task.id }, order: [['startedAt', 'DESC']] }),
      TaskProgressUpdate.findAll({ where: { taskId: task.id }, order: [['createdAt', 'DESC']] }),
    ]);
    const now = new Date();
    const workedMinutes = logs.reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);
    const running = logs.find((l) => !l.endedAt);
    const priorWorkedSeconds = logs.filter((l) => l.endedAt).reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 1000)), 0);
    res.json({
      ...task.toJSON(),
      workedMinutes,
      workedSeconds: Math.round(workedMinutes * 60),
      priorWorkedSeconds,
      running: !!running,
      runningSince: running ? running.startedAt : null,
      logs,
      progressUpdates: updates,
      messages: task.messages || [],
      subtasks: task.subtasks || [],
      overrunSeconds: task.timeOverrunSeconds || 0,
      savedSeconds: task.timeSavedSeconds || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', requireManage, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const { title, description, projectId, priority, dueDate, estimatedMinutes, status, assignedTo } = req.body;
    const before = { status: task.status, assignedTo: task.assignedTo };

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'Title is required' });
      task.title = String(title).trim().slice(0, 200);
    }
    if (description !== undefined) task.description = description;
    if (projectId !== undefined) task.projectId = projectId || null;
    if (priority && PRIORITIES.includes(priority)) task.priority = priority;
    if (dueDate !== undefined) {
      if (dueDate && !isValidDateStr(dueDate)) return res.status(400).json({ message: 'Invalid due date' });
      task.dueDate = dueDate || null;
    }
    if (estimatedMinutes !== undefined) {
      task.estimatedMinutes = Number(estimatedMinutes) > 0 ? Math.round(Number(estimatedMinutes)) : null;
    }
    if (assignedTo && Number(assignedTo) !== task.assignedTo) {
      const emp = await Employee.findByPk(Number(assignedTo), { attributes: ['id'] });
      if (!emp) return res.status(400).json({ message: 'Employee not found' });
      await TaskTimeLog.update({ endedAt: new Date(), source: 'auto_stopped' }, { where: { taskId: task.id, endedAt: null } });
      task.assignedTo = emp.id;
    }
    if (status && status !== task.status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      task.status = status;
      task.completedAt = status === 'Done' ? new Date() : null;
      if (status === 'Done') task.progress = 100;
      if (['Done', 'Cancelled', 'On Hold'].includes(status)) {
        await TaskTimeLog.update({ endedAt: new Date() }, { where: { taskId: task.id, endedAt: null } });
      }
    }
    await syncTaskVariance(task);
    await task.save();

    if (task.assignedTo !== before.assignedTo) {
      await safeNotify(task.assignedTo, 'TaskAssigned', truncate(`Task assigned to you: ${task.title}`, 250), 'Task', task.id);
    } else if (task.status !== before.status) {
      await safeNotify(task.assignedTo, 'TaskUpdated', truncate(`Task "${task.title}" marked ${task.status}`, 250), 'Task', task.id);
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', requireManage, async (req, res) => {
  try {
    const n = await Task.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Subtasks (Admin) ---------- */

router.post('/:id/subtasks', requireManage, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Subtask title is required' });
    const count = await TaskSubtask.count({ where: { taskId: task.id } });
    const sub = await TaskSubtask.create({
      taskId: task.id,
      title: title.slice(0, 250),
      description: req.body.description || null,
      createdByType: 'admin',
      createdById: req.actor.id,
      createdByName: req.actor.name,
      sortOrder: count,
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/subtasks/:subtaskId', requireManage, async (req, res) => {
  try {
    const sub = await TaskSubtask.findOne({ where: { id: req.params.subtaskId, taskId: req.params.id } });
    if (!sub) return res.status(404).json({ message: 'Subtask not found' });
    if (req.body.title !== undefined) {
      const t = String(req.body.title).trim();
      if (!t) return res.status(400).json({ message: 'Title cannot be empty' });
      sub.title = t.slice(0, 250);
    }
    if (req.body.isCompleted !== undefined) {
      sub.isCompleted = !!req.body.isCompleted;
      sub.status = sub.isCompleted ? 'Done' : 'To Do';
      if (sub.isCompleted && !sub.completedAt) {
        sub.completedAt = new Date();
        sub.completedByType = 'admin';
        sub.completedByName = req.actor.name;
      } else if (!sub.isCompleted) {
        sub.completedAt = null;
        sub.completedByType = null;
        sub.completedByName = null;
      }
    }
    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/subtasks/:subtaskId', requireManage, async (req, res) => {
  try {
    const n = await TaskSubtask.destroy({ where: { id: req.params.subtaskId, taskId: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Subtask not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Messages (Admin) ---------- */

router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await TaskMessage.findAll({
      where: { taskId: req.params.id },
      include: [{ model: TaskMessageAttachment, as: 'attachments' }],
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/messages', requireManage, uploadTaskFiles.array('files', 10), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const text = String(req.body.message || '').trim();
    const files = req.files || [];
    if (!text && !files.length) return res.status(400).json({ message: 'Enter a message or attach a file' });

    const created = await TaskMessage.create({
      taskId: task.id,
      senderType: 'admin',
      senderId: req.actor.id,
      senderName: req.actor.name,
      message: text || null,
    });

    if (files.length) {
      await TaskMessageAttachment.bulkCreate(
        files.map((f) => ({
          messageId: created.id,
          taskId: task.id,
          fileName: f.originalname,
          filePath: `/uploads/tasks/${f.filename}`,
          mimeType: f.mimetype,
          fileSize: f.size,
        }))
      );
    }

    const full = await TaskMessage.findByPk(created.id, {
      include: [{ model: TaskMessageAttachment, as: 'attachments' }],
    });

    await safeNotify(task.assignedTo, 'TaskMessage', truncate(`${req.actor.name} commented on "${task.title}"`, 250), 'Task', task.id);
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;