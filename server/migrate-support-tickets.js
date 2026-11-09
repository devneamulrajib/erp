// Safe, re-runnable migration for the Support Center.
//   node migrate-support-tickets.js
// Only ADDS columns / tables / indexes and WIDENS the status enum. Existing rows (e.g. SUP-0001)
// and their screenshots are kept. Run it BEFORE starting the server with the new code.
require('dotenv').config();
const { QueryTypes } = require('sequelize');
const sequelize = require('./config/db');

const TABLE = 'support_tickets';

async function tableExists(name) {
  const r = await sequelize.query(
    'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t',
    { replacements: { t: name }, type: QueryTypes.SELECT }
  );
  return Number(r[0].c) > 0;
}

async function hasColumn(name) {
  const r = await sequelize.query(
    'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c',
    { replacements: { t: TABLE, c: name }, type: QueryTypes.SELECT }
  );
  return Number(r[0].c) > 0;
}

async function hasIndex(name) {
  const r = await sequelize.query(
    'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND INDEX_NAME = :i',
    { replacements: { t: TABLE, i: name }, type: QueryTypes.SELECT }
  );
  return Number(r[0].c) > 0;
}

async function addColumn(name, ddl) {
  if (await hasColumn(name)) return;
  await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN ${name} ${ddl}`);
  console.log('  + column', name);
}

async function addIndex(name, cols) {
  if (await hasIndex(name)) return;
  await sequelize.query(`CREATE INDEX ${name} ON ${TABLE} (${cols})`);
  console.log('  + index', name);
}

async function migrate() {
  const SupportTicket = require('./models/SupportTicket');
  const exists = await tableExists(TABLE);

  if (!exists) {
    // Fresh install: let Sequelize create table + indexes cleanly
    await SupportTicket.sync();
    console.log('  table created:', TABLE);
  } else {
    // Existing install: add columns first before any index creation
    await sequelize.query(
      `ALTER TABLE ${TABLE} MODIFY COLUMN status
       ENUM('open','in_progress','pending_customer','pending_internal','resolved','closed','reopened')
       NOT NULL DEFAULT 'open'`
    );

    await addColumn('category', "ENUM('bug','technical_issue','access_problem','data_issue','feature_request','general_inquiry') NOT NULL DEFAULT 'bug'");
    await addColumn('module', 'VARCHAR(40) NULL');
    await addColumn('referenceNo', 'VARCHAR(120) NULL');
    await addColumn('assignedToName', 'VARCHAR(150) NULL');
    await addColumn('closedAt', 'DATETIME NULL');
    await addColumn('statusChangedAt', 'DATETIME NULL');
    await addColumn('firstResponseAt', 'DATETIME NULL');
    await addColumn('firstResponseDueAt', 'DATETIME NULL');
    await addColumn('resolutionDueAt', 'DATETIME NULL');
    await addColumn('slaCustom', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumn('pausedSeconds', 'INT NOT NULL DEFAULT 0');
    await addColumn('pausedSince', 'DATETIME NULL');
    await addColumn('lastResponseAt', 'DATETIME NULL');
    await addColumn('slaFrAlert', 'TINYINT NOT NULL DEFAULT 0');
    await addColumn('slaResAlert', 'TINYINT NOT NULL DEFAULT 0');
    await addColumn('reopenCount', 'INT NOT NULL DEFAULT 0');
    await addColumn('archivedAt', 'DATETIME NULL');
    await addColumn('archivedById', 'VARCHAR(64) NULL');

    await addIndex('idx_st_status', 'status');
    await addIndex('idx_st_severity', 'severity');
    await addIndex('idx_st_assigned', 'assignedToId');
    await addIndex('idx_st_reporter', 'reporterId');
    await addIndex('idx_st_created', 'createdAt');
    await addIndex('idx_st_category', 'category');
  }

  // 2. New tables (created from the models so model and table can never drift apart).
  const models = [
    './models/SupportSlaRule',
    './models/SupportTicketMessage',
    './models/SupportTicketEvent',
    './models/SupportTicketAttachment',
    './models/SupportTicketLink',
  ];
  for (const m of models) {
    await require(m).sync();
    console.log('  table ok:', require(m).getTableName());
  }

  // 3. Default SLA targets (only when the table is empty). Admins can change them in the UI.
  const SupportSlaRule = require('./models/SupportSlaRule');
  if ((await SupportSlaRule.count()) === 0) {
    await SupportSlaRule.bulkCreate([
      { priority: 'critical', firstResponseMins: 60, resolutionMins: 480 },
      { priority: 'high', firstResponseMins: 240, resolutionMins: 1440 },
      { priority: 'medium', firstResponseMins: 480, resolutionMins: 4320 },
      { priority: 'low', firstResponseMins: 1440, resolutionMins: 10080 },
    ]);
    console.log('  seeded default SLA rules (critical 1h/8h, high 4h/24h, medium 8h/3d, low 24h/7d)');
  }

  // 4. Back-fill existing tickets (non-destructive: only fills empty values).
  if (await hasColumn('type')) {
    await sequelize.query(
      `UPDATE ${TABLE}
       SET category = CASE type WHEN 'suggestion' THEN 'feature_request' WHEN 'difficulty' THEN 'technical_issue' ELSE 'bug' END
       WHERE category = 'bug' AND type <> 'bug'`
    );
  }

  await sequelize.query(`UPDATE ${TABLE} SET statusChangedAt = COALESCE(resolvedAt, createdAt) WHERE statusChangedAt IS NULL`);
  await sequelize.query(`UPDATE ${TABLE} SET closedAt = COALESCE(resolvedAt, updatedAt) WHERE status = 'closed' AND closedAt IS NULL`);
  await sequelize.query(
    `UPDATE ${TABLE} t JOIN support_sla_rules r ON r.priority = t.severity
     SET t.firstResponseDueAt = DATE_ADD(t.createdAt, INTERVAL r.firstResponseMins MINUTE),
         t.resolutionDueAt = DATE_ADD(t.createdAt, INTERVAL r.resolutionMins MINUTE)
     WHERE t.firstResponseDueAt IS NULL AND t.resolutionDueAt IS NULL`
  );
  await sequelize.query(
    `INSERT INTO support_ticket_events (ticketId, type, actorId, actorName, isInternal, createdAt)
     SELECT t.id, 'created', t.reporterId, t.reporterName, 0, t.createdAt
     FROM ${TABLE} t
     WHERE NOT EXISTS (SELECT 1 FROM support_ticket_events e WHERE e.ticketId = t.id AND e.type = 'created')`
  );

  console.log('Support ticket migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});