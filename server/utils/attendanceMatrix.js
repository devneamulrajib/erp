const { Op } = require('sequelize');
const { Attendance, LeaveRequest } = require('../models/associations');

const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dhaka';
const WEEKLY_OFF_DAYS = [5]; // 0=Sun … 5=Fri, 6=Sat (keep in sync with portalEmployee.js)

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const isWeeklyOff = (s) => WEEKLY_OFF_DAYS.includes(new Date(`${s}T00:00:00Z`).getUTCDay());

// Returns one row per employee with a status for every day of the month.
// Precedence: stored record → weekly off → approved leave → Absent (past days)
// Future days and days before joining are null.
async function monthMatrix(employees, year, month) {
  const today = todayStr();
  const mm = String(month).padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${year}-${mm}-01`;
  const to = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`;
  const ids = employees.map((e) => e.id);
  if (!ids.length) return { today, daysInMonth, rows: [] };

  const [records, leaves] = await Promise.all([
    Attendance.findAll({
      where: { employeeId: ids, date: { [Op.between]: [from, to] } },
      order: [['id', 'ASC']],
    }),
    LeaveRequest.findAll({
      where: {
        employeeId: ids,
        status: 'Approved',
        fromDate: { [Op.lte]: to },
        toDate: { [Op.gte]: from },
      },
    }),
  ]);

  const recMap = {};
  records.forEach((r) => {
    (recMap[r.employeeId] ||= {})[r.date] = r.status; // latest row wins on duplicates
  });
  const leaveMap = {};
  leaves.forEach((l) => { (leaveMap[l.employeeId] ||= []).push(l); });

  const rows = employees.map((e) => {
    const joining = e.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : null;
    const counts = { present: 0, absent: 0, leave: 0, holiday: 0, off: 0 };
    const days = [];

    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = `${year}-${mm}-${String(d).padStart(2, '0')}`;
      if ((joining && date < joining) || date > today) { days.push(null); continue; }

      const off = isWeeklyOff(date);
      let status = recMap[e.id]?.[date];
      if (status === 'Leave' && off) status = 'Off';
      if (!status) {
        if (off) status = 'Off';
        else if ((leaveMap[e.id] || []).some((l) => l.fromDate <= date && date <= l.toDate)) status = 'Leave';
        else if (date < today) status = 'Absent';
        else status = 'Pending';
      }
      const key = status.toLowerCase();
      if (key in counts) counts[key] += 1;
      days.push(status);
    }

    return {
      id: e.id, code: e.code, name: e.name,
      department: e.department, designation: e.designation,
      counts, days,
    };
  });

  return { today, daysInMonth, rows };
}

module.exports = { monthMatrix, WEEKLY_OFF_DAYS };