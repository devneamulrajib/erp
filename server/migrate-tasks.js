require('dotenv').config();
const sequelize = require('./config/db');
const {
  Task, TaskProgressUpdate, TaskTimeLog, TaskSubtask, TaskMessage, TaskMessageAttachment,
} = require('./models/associations');

async function addColumnIfMissing(table, column, ddl) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  if (Number(rows[0].c) > 0) return console.log(`  ${table}.${column} exists`);
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
  console.log(`  added ${table}.${column}`);
}

(async () => {
  try {
    await sequelize.authenticate();
    await Task.sync();
    await TaskProgressUpdate.sync();
    await TaskTimeLog.sync();
    await TaskSubtask.sync();
    await TaskMessage.sync();
    await TaskMessageAttachment.sync();
    console.log('Task tables ready');

    const taskTable = typeof Task.getTableName() === 'string' ? Task.getTableName() : Task.getTableName().tableName;
    await addColumnIfMissing(taskTable, 'confirmedAt', 'DATETIME NULL');
    await addColumnIfMissing(taskTable, 'timeSavedSeconds', 'INT NULL');
    await addColumnIfMissing(taskTable, 'timeOverrunSeconds', 'INT NULL');

    await sequelize.query(
      `UPDATE \`${taskTable}\` SET confirmedAt = COALESCE(startedAt, createdAt)
       WHERE confirmedAt IS NULL AND (startedAt IS NOT NULL OR status <> 'To Do')`
    );

    await addColumnIfMissing('attendances', 'checkInAt', 'DATETIME NULL');
    await addColumnIfMissing('attendances', 'checkOutAt', 'DATETIME NULL');
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();