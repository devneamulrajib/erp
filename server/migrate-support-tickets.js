require('dotenv').config();
const SupportTicket = require('./models/SupportTicket');

(async () => {
  try {
    // alter: true adds the new columns (resolutionNote, resolvedById) to the existing table
    await SupportTicket.sync({ alter: true });
    console.log('support_tickets table up to date');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();