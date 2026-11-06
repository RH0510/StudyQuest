// Secondary logical backup (Section 4.8, 7.2): exports every collection to a dated folder as
// Extended JSON so ObjectIds and dates are restored exactly. Run with: npm run backup
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { BSON } = require('mongodb');
const { connectToDatabase, getDb, closeDatabase } = require('../config/db');

const COLLECTIONS = ['users', 'tasks', 'rewards', 'progress', 'periods', 'modules'];
const RETENTION_DAYS = 30;

function stamp(date) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function removeOldBackups(root) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    if (fs.statSync(full).isDirectory() && fs.statSync(full).mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`Removed backup older than ${RETENTION_DAYS} days: ${name}`);
    }
  }
}

(async () => {
  const root = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
  const folder = path.join(root, `backup-${stamp(new Date())}`);
  try {
    await connectToDatabase(process.env.MONGODB_URI, process.env.DB_NAME || 'studyquest');
    fs.mkdirSync(folder, { recursive: true });
    const summary = {};
    for (const name of COLLECTIONS) {
      const docs = await getDb().collection(name).find({}).toArray();
      fs.writeFileSync(path.join(folder, `${name}.json`), BSON.EJSON.stringify(docs, null, 2, { relaxed: false }));
      summary[name] = docs.length;
    }
    fs.writeFileSync(path.join(folder, 'summary.json'), JSON.stringify({ createdAt: new Date().toISOString(), counts: summary }, null, 2));
    console.log(`Backup complete: ${folder}`);
    console.table(summary);
    removeOldBackups(root);
  } catch (err) {
    console.error('BACKUP FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
})();
