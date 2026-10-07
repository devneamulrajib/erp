const sequelize = require('./config/db');
const AttendanceCorrection = require('./models/AttendanceCorrection');

(async () => {
  try {
    await sequelize.authenticate();
    await AttendanceCorrection.sync();
    console.log('attendance_corrections table is ready');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();