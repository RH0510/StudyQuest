// Creates the StudyQuest collections and indexes (Section 4.5.7). Safe to run more than once.
require('dotenv').config();
const { connectToDatabase, getDb, ensureIndexes, closeDatabase } = require('../config/db');

const COLLECTIONS = ['users', 'tasks', 'rewards', 'progress', 'periods', 'modules'];

(async () => {
  try {
    await connectToDatabase(process.env.MONGODB_URI, process.env.DB_NAME || 'studyquest');
    const db = getDb();
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const name of COLLECTIONS) {
      if (!existing.has(name)) {
        await db.createCollection(name);
        console.log(`Created collection: ${name}`);
      } else {
        console.log(`Collection exists: ${name}`);
      }
    }
    await ensureIndexes();
    console.log(`Indexes ready. Database "${db.databaseName}" is set up.`);
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
})();
