// Mounted from portalEmployee.js at /api/portal/employee/tasks
// (portalAuth + requireRole('employee') already applied by the parent router)
const router = require('express').Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  Employee, Task, TaskProgressUpdate, TaskTimeLog, Project, Attendance,
  TaskSubtask, TaskMessage, TaskMessageAttachment,
} = require('../models/associations');
const { notifyAdmin } = require('../utils/notify');
const {
  todayStr, isValidDateStr, shiftDay, minutesBetween, truncate, stopRunningLogs, computeDay, dayBounds,
} = require('../utils/taskTime');

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const CLOSED = ['Done', 'Cancelled'];
const SUBTASK_STATUSES = ['To Do', 'In Progress', 'Done'];

const me = (req) => req.portalUser.customerId;
const safeNotify = async (...args) => { try { await notifyAdmin(...args); } catch (e) { /* ignore */ } };

const minutesOf = (logs, now = new Date()) =>
  logs.reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);

async function loadOwnTask(req, res, id) {
  const task = await Task.findOne({ where: { id, assignedTo: me(req) } });
  if (!task) res.status(404).json({ message: 'Task not found' });
  return task;
}

function withWorked(task, logs) {
  const mine = logs.filter((l) => l.taskId === task.id);
  const running = mine.find((l) => !l.endedAt);
  const priorWorkedSeconds = mine
    .filter((l) => l.endedAt)
    .reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 1000)), 0);
  return {
    ...task.toJSON(),
    workedMinutes: minutesOf(mine),
    priorWorkedSeconds,
    running: !!running,
    runningSince: running ? running.startedAt : null,
  };
}

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

async function syncTaskVariance(TaskTimeLog, task, transaction) {
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

async function recalculateSubtaskProgress(task) {
  const subs = await TaskSubtask.findAll({ where: { taskId: task.id } });
  if (!subs.length) return;
  const done = subs.filter((s) => s.isCompleted).length;
  task.progress = Math.round((done / subs.length) * 100);
  await task.save();
}

/* ---------- List / create ---------- */

router.get('/', async (req, res) => {
  try {
    const where = { assignedTo: me(req) };
    if (req.query.status === 'open') where.status = { [Op.notIn]: CLOSED };
    else if (STATUSES.includes(req.query.status)) where.status = req.query.status;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'], required: false },
        { model: TaskSubtask, as: 'subtasks', attributes: ['id', 'isCompleted'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const logs = tasks.length
      ? await TaskTimeLog.findAll({ where: { taskId: tasks.map((t) => t.id) } })
      : [];
    res.json(tasks.map((t) => {
      const worked = withWorked(t, logs);
      const subs = t.subtasks || [];
      return {
        ...worked,
        subtasksTotal: subs.length,
        subtasksDone: subs.filter((s) => s.isCompleted).length,
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, projectId, priority, dueDate, estimatedMinutes, subtasks } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
    if (dueDate && !isValidDateStr(dueDate)) return res.status(400).json({ message: 'Invalid due date' });
    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'name', 'code'] });
    if (!emp) return res.status(404).json({ message: 'Not found' });

    const task = await Task.create({
      title: String(title).trim().slice(0, 200),
      description: description || '',
      projectId: projectId || null,
      assignedTo: emp.id,
      createdByType: 'employee',
      createdById: emp.id,
      createdByName: emp.name,
      priority: PRIORITIES.includes(priority) ? priority : 'Medium',
      dueDate: dueDate || null,
      estimatedMinutes: Number(estimatedMinutes) > 0 ? Math.round(Number(estimatedMinutes)) : null,
    });

    if (Array.isArray(subtasks) && subtasks.length) {
      await TaskSubtask.bulkCreate(
        subtasks.filter(Boolean).map((st, i) => ({
          taskId: task.id,
          title: String(st).trim().slice(0, 250),
          createdByType: 'employee',
          createdById: emp.id,
          createdByName: emp.name,
          sortOrder: i,
        }))
      );
    }
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Timer state / work log ---------- */

router.get('/running', async (req, res) => {
  try {
    const log = await TaskTimeLog.findOne({
      where: { employeeId: me(req), endedAt: null },
      include: [{ model: Task, as: 'task', attributes: ['id', 'title', 'status', 'progress', 'estimatedMinutes'] }],
    });
    if (!log) return res.json(null);
    const priorLogs = await TaskTimeLog.findAll({ where: { taskId: log.taskId, endedAt: { [Op.ne]: null } } });
    const priorWorkedSeconds = priorLogs.reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 1000)), 0);
    res.json({ ...log.toJSON(), priorWorkedSeconds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/worklog', async (req, res) => {
  try {
    const date = isValidDateStr(req.query.date) ? req.query.date : todayStr();
    const day = await computeDay({ Attendance, TaskTimeLog }, me(req), date);
    const taskIds = [...new Set(day.logs.map((l) => l.taskId))];
    const tasks = taskIds.length
      ? await Task.findAll({ where: { id: taskIds }, attributes: ['id', 'title'] })
      : [];
    const titleOf = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
    const { logs, ...summary } = day;
    res.json({
      ...summary,
      logs: logs.map((l) => ({ ...l.toJSON(), taskTitle: titleOf[l.taskId] || '' })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/time/manual', async (req, res) => {
  try {
    const { taskId, startedAt, endedAt, note } = req.body;
    if (!note || !String(note).trim()) return res.status(400).json({ message: 'A reason is required for manual entries' });
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ message: 'Valid start and end times are required' });
    if (end <= start) return res.status(400).json({ message: 'End must be after start' });
    if (end > new Date()) return res.status(400).json({ message: 'End time cannot be in the future' });
    if (end - start > 16 * 3600000) return res.status(400).json({ message: 'A single entry cannot exceed 16 hours' });
    const earliest = dayBounds(shiftDay(todayStr(), -2)).start;
    if (start < earliest) return res.status(400).json({ message: 'Manual entries are limited to the last 2 days' });

    const task = await loadOwnTask(req, res, taskId);
    if (!task) return;

    const overlap = await TaskTimeLog.findOne({
      where: {
        employeeId: me(req),
        startedAt: { [Op.lt]: end },
        [Op.or]: [{ endedAt: null }, { endedAt: { [Op.gt]: start } }],
      },
    });
    if (overlap) return res.status(400).json({ message: 'This overlaps with another time entry' });

    const log = await TaskTimeLog.create({
      taskId: task.id, employeeId: me(req), startedAt: start, endedAt: end,
      source: 'manual', note: String(note).trim().slice(0, 500),
    });
    await syncTaskVariance(TaskTimeLog, task);
    await task.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Single task ---------- */

router.get('/:id', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const [logs, updates, project, subtasks, messages] = await Promise.all([
      TaskTimeLog.findAll({ where: { taskId: task.id }, order: [['startedAt', 'DESC']] }),
      TaskProgressUpdate.findAll({ where: { taskId: task.id }, order: [['createdAt', 'DESC']] }),
      task.projectId ? Project.findByPk(task.projectId, { attributes: ['id', 'name'] }) : null,
      TaskSubtask.findAll({ where: { taskId: task.id }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] }),
      TaskMessage.findAll({
        where: { taskId: task.id },
        include: [{ model: TaskMessageAttachment, as: 'attachments' }],
        order: [['createdAt', 'ASC'], ['id', 'ASC']],
      }),
    ]);
    res.json({
      ...withWorked(task, logs),
      project,
      logs,
      progressUpdates: updates,
      subtasks,
      messages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const { status, title, description, priority, dueDate, estimatedMinutes } = req.body;
    const ownTask = task.createdByType === 'employee';

    if (ownTask) {
      if (title !== undefined) {
        if (!String(title).trim()) return res.status(400).json({ message: 'Title is required' });
        task.title = String(title).trim().slice(0, 200);
      }
      if (description !== undefined) task.description = description;
      if (priority && PRIORITIES.includes(priority)) task.priority = priority;
      if (dueDate !== undefined) {
        if (dueDate && !isValidDateStr(dueDate)) return res.status(400).json({ message: 'Invalid due date' });
        task.dueDate = dueDate || null;
      }
      if (estimatedMinutes !== undefined) {
        task.estimatedMinutes = Number(estimatedMinutes) > 0 ? Math.round(Number(estimatedMinutes)) : null;
      }
    }

    let becameDone = false;
    if (status !== undefined && status !== task.status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      if (status === 'Cancelled' && !ownTask) {
        return res.status(403).json({ message: 'Only admin can cancel an assigned task' });
      }
      if (status !== 'To Do' && status !== 'Cancelled' && !task.confirmedAt) {
        task.confirmedAt = new Date();
      }
      if (status === 'Done') {
        task.progress = 100;
        task.completedAt = new Date();
        becameDone = true;
      } else {
        task.completedAt = null;
        if (status === 'In Progress' && !task.startedAt) task.startedAt = new Date();
      }
      task.status = status;
    }

    await sequelize.transaction(async (t) => {
      if (CLOSED.includes(task.status) || task.status === 'On Hold') {
        await stopRunningLogs(TaskTimeLog, me(req), { taskId: task.id, transaction: t });
      }
      await syncTaskVariance(TaskTimeLog, task, t);
      await task.save({ transaction: t });
    });

    if (becameDone) {
      const emp = await Employee.findByPk(me(req), { attributes: ['name', 'code'] });
      await safeNotify(
        'TaskCompleted',
        truncate(`${emp?.name} (${emp?.code}) completed task: ${task.title}`, 250),
        'Task',
        task.id,
      );
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/progress', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    if (CLOSED.includes(task.status)) return res.status(400).json({ message: 'This task is closed' });
    const percent = Math.round(Number(req.body.percent));
    if (!(percent >= 0 && percent <= 100)) return res.status(400).json({ message: 'Progress must be 0–100' });

    const update = await TaskProgressUpdate.create({
      taskId: task.id, employeeId: me(req), percent, note: req.body.note || '',
    });
    task.progress = percent;
    if (task.status === 'To Do' && percent > 0) {
      task.confirmedAt = task.confirmedAt || new Date();
      task.status = 'In Progress';
      task.startedAt = task.startedAt || new Date();
    }
    await task.save();
    res.status(201).json({ update, task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Confirm & Timer ---------- */

router.post('/:id/confirm', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    if (CLOSED.includes(task.status)) return res.status(400).json({ message: 'This task is closed' });

    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'name', 'code', 'status'] });
    if (!emp || emp.status !== 'Active') return res.status(403).json({ message: 'Account is not active' });

    const today = todayStr();
    const att = await Attendance.findAll({ where: { employeeId: me(req), date: today }, order: [['id', 'DESC']] });
    if (att[0] && att[0].status !== 'Present') {
      return res.status(400).json({ message: `Today is recorded as ${att[0].status}. You can't start a timer.` });
    }
    if (att.some((r) => r.checkOutAt)) {
      return res.status(400).json({ message: 'You have already checked out today.' });
    }

    const startNow = req.body?.start !== false;
    const result = await sequelize.transaction(async (t) => {
      await Employee.findByPk(me(req), { transaction: t, lock: t.LOCK.UPDATE });
      const now = new Date();
      if (!task.confirmedAt) task.confirmedAt = now;

      let log = null;
      if (startNow) {
        await stopRunningLogs(TaskTimeLog, me(req), { transaction: t });
        if (task.status !== 'In Progress') {
          task.status = 'In Progress';
          task.completedAt = null;
        }
        task.startedAt = task.startedAt || now;
        log = await TaskTimeLog.create(
          { taskId: task.id, employeeId: me(req), startedAt: now, source: 'timer' },
          { transaction: t }
        );
      }
      await task.save({ transaction: t });
      return { task, log };
    });

    await safeNotify(
      'TaskConfirmed',
      truncate(`${emp.name} (${emp.code}) confirmed & started: ${task.title}`, 250),
      'Task',
      task.id,
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    if (CLOSED.includes(task.status)) return res.status(400).json({ message: 'This task is closed' });
    if (!task.confirmedAt) {
      return res.status(400).json({ message: 'Please confirm this task first to start the timer.' });
    }

    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'status'] });
    if (!emp || emp.status !== 'Active') return res.status(403).json({ message: 'Account is not active' });

    const today = todayStr();
    const att = await Attendance.findAll({ where: { employeeId: me(req), date: today }, order: [['id', 'DESC']] });
    if (att[0] && att[0].status !== 'Present') {
      return res.status(400).json({ message: `Today is recorded as ${att[0].status}. You can't start a timer.` });
    }
    if (att.some((r) => r.checkOutAt)) {
      return res.status(400).json({ message: 'You have already checked out today.' });
    }

    const log = await sequelize.transaction(async (t) => {
      await Employee.findByPk(me(req), { transaction: t, lock: t.LOCK.UPDATE });
      await stopRunningLogs(TaskTimeLog, me(req), { transaction: t });
      if (task.status !== 'In Progress') {
        task.status = 'In Progress';
        task.completedAt = null;
      }
      task.startedAt = task.startedAt || new Date();
      await task.save({ transaction: t });
      return TaskTimeLog.create(
        { taskId: task.id, employeeId: me(req), startedAt: new Date(), source: 'timer' },
        { transaction: t },
      );
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const stopped = await sequelize.transaction(async (t) => {
      const n = await stopRunningLogs(TaskTimeLog, me(req), { taskId: task.id, transaction: t });
      if (n) {
        await syncTaskVariance(TaskTimeLog, task, t);
        await task.save({ transaction: t });
      }
      return n;
    });
    if (!stopped) return res.status(400).json({ message: 'No timer running on this task' });
    res.json({ stopped, task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Subtasks ---------- */

router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    if (CLOSED.includes(task.status)) return res.status(400).json({ message: 'This task is closed' });
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Subtask title is required' });

    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'name'] });
    const count = await TaskSubtask.count({ where: { taskId: task.id } });
    const sub = await TaskSubtask.create({
      taskId: task.id,
      title: title.slice(0, 250),
      description: req.body.description || null,
      createdByType: 'employee',
      createdById: emp?.id || me(req),
      createdByName: emp?.name || 'Employee',
      sortOrder: count,
    });
    await recalculateSubtaskProgress(task);
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const sub = await TaskSubtask.findOne({ where: { id: req.params.subtaskId, taskId: task.id } });
    if (!sub) return res.status(404).json({ message: 'Subtask not found' });

    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'name'] });
    if (req.body.title !== undefined && sub.createdByType === 'employee') {
      const t = String(req.body.title).trim();
      if (!t) return res.status(400).json({ message: 'Subtask title cannot be empty' });
      sub.title = t.slice(0, 250);
    }
    if (req.body.status && SUBTASK_STATUSES.includes(req.body.status)) {
      sub.status = req.body.status;
      sub.isCompleted = req.body.status === 'Done';
    } else if (req.body.isCompleted !== undefined) {
      sub.isCompleted = !!req.body.isCompleted;
      sub.status = sub.isCompleted ? 'Done' : 'To Do';
    }
    if (sub.isCompleted && !sub.completedAt) {
      sub.completedAt = new Date();
      sub.completedByType = 'employee';
      sub.completedByName = emp?.name || 'Employee';
    } else if (!sub.isCompleted) {
      sub.completedAt = null;
      sub.completedByType = null;
      sub.completedByName = null;
    }
    await sub.save();
    await recalculateSubtaskProgress(task);
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const sub = await TaskSubtask.findOne({ where: { id: req.params.subtaskId, taskId: task.id } });
    if (!sub) return res.status(404).json({ message: 'Subtask not found' });
    if (sub.createdByType !== 'employee' && task.createdByType !== 'employee') {
      return res.status(403).json({ message: 'Only admin can delete admin-created subtasks' });
    }
    await sub.destroy();
    await recalculateSubtaskProgress(task);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Conversation & File Sharing ---------- */

router.get('/:id/messages', async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const messages = await TaskMessage.findAll({
      where: { taskId: task.id },
      include: [{ model: TaskMessageAttachment, as: 'attachments' }],
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/messages', uploadTaskFiles.array('files', 10), async (req, res) => {
  try {
    const task = await loadOwnTask(req, res, req.params.id);
    if (!task) return;
    const text = String(req.body.message || '').trim();
    const files = req.files || [];
    if (!text && !files.length) return res.status(400).json({ message: 'Enter a message or attach a file' });

    const emp = await Employee.findByPk(me(req), { attributes: ['id', 'name', 'code'] });
    const created = await sequelize.transaction(async (t) => {
      const msg = await TaskMessage.create({
        taskId: task.id,
        senderType: 'employee',
        senderId: emp?.id || me(req),
        senderName: emp?.name || 'Employee',
        message: text || null,
      }, { transaction: t });

      if (files.length) {
        await TaskMessageAttachment.bulkCreate(
          files.map((f) => ({
            messageId: msg.id,
            taskId: task.id,
            fileName: f.originalname,
            filePath: `/uploads/tasks/${f.filename}`,
            mimeType: f.mimetype,
            fileSize: f.size,
          })),
          { transaction: t }
        );
      }
      return msg;
    });

    const full = await TaskMessage.findByPk(created.id, {
      include: [{ model: TaskMessageAttachment, as: 'attachments' }],
    });

    await safeNotify(
      'TaskMessage',
      truncate(`${emp?.name} (${emp?.code}) commented on "${task.title}": ${text || `${files.length} file(s)`}`, 250),
      'Task',
      task.id,
    );
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;