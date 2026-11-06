// Restores a backup made by backup.js (Section 4.8, 8.1). Existing data in each collection is replaced.
// Usage: npm run restore -- backups/backup-2026-11-03T10-00-00
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { BSON } = require('mongodb');
const { connectToDatabase, getDb, ensureIndexes, closeDatabase } = require('../config/db');

const COLLECTIONS = ['users', 'tasks', 'rewards', 'progress', 'periods', 'modules'];

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

(async () => {
  const folder = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!folder || !fs.existsSync(path.join(folder, 'summary.json'))) {
    console.error('Give the backup folder to restore, for example: npm run restore -- backups/backup-2026-11-03T10-00-00');
    process.exitCode = 1;
    return;
  }
  const answer = await confirm(`This replaces ALL data in "${process.env.DB_NAME || 'studyquest'}" with ${path.basename(folder)}. Type RESTORE to continue: `);
  if (answer !== 'RESTORE') {
    console.log('Restore cancelled.');
    return;
  }
  try {
    await connectToDatabase(process.env.MONGODB_URI, process.env.DB_NAME || 'studyquest');
    for (const name of COLLECTIONS) {
      const file = path.join(folder, `${name}.json`);
      if (!fs.existsSync(file)) continue;
      const docs = BSON.EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });
      const collection = getDb().collection(name);
      await collection.deleteMany({});
      if (docs.length) await collection.insertMany(docs);
      console.log(`Restored ${docs.length} documents into ${name}`);
    }
    await ensureIndexes();
    console.log('Restore complete. Check login, tasks, progress totals and rewards before reopening the app.');
  } catch (err) {
    console.error('RESTORE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
})();
