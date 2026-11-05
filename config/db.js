const { MongoClient } = require('mongodb');

let client = null;
let database = null;

async function connectToDatabase(uri, dbName) {
  if (database) return database;
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string.');
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  database = client.db(dbName || undefined);
  return database;
}

function getDb() {
  if (!database) throw new Error('Database not connected. Call connectToDatabase() first.');
  return database;
}

function collections() {
  const db = getDb();
  return {
    users: db.collection('users'),
    tasks: db.collection('tasks'),
    rewards: db.collection('rewards'),
    progress: db.collection('progress'),
    periods: db.collection('periods'),
    modules: db.collection('modules'),
  };
}

// Indexes from Section 4.5.7, plus the two collections added for the academic calendar.
async function ensureIndexes() {
  const c = collections();
  await c.users.createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
  await c.rewards.createIndex({ userId: 1 }, { unique: true, name: 'rewards_user_unique' });
  await c.progress.createIndex({ userId: 1 }, { unique: true, name: 'progress_user_unique' });
  await c.tasks.createIndex({ userId: 1, dueDate: 1 }, { name: 'tasks_user_due' });
  await c.tasks.createIndex({ userId: 1, moduleId: 1 }, { name: 'tasks_user_module' });
  await c.periods.createIndex({ userId: 1, startDate: 1 }, { name: 'periods_user_start' });
  await c.modules.createIndex({ userId: 1, periodId: 1 }, { name: 'modules_user_period' });
}

async function closeDatabase() {
  if (client) await client.close();
  client = null;
  database = null;
}

module.exports = { connectToDatabase, getDb, collections, ensureIndexes, closeDatabase };
