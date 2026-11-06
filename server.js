require('dotenv').config();

const { connectToDatabase, ensureIndexes, closeDatabase } = require('./config/db');
const { createApp } = require('./app');

// BEGIN SERVER (Section 4.6.5)
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET is missing or shorter than 32 characters. Set it in your .env file.');
    process.exit(1);
  }
  try {
    await connectToDatabase(process.env.MONGODB_URI, process.env.DB_NAME || 'studyquest');
    await ensureIndexes();
  } catch (err) {
    console.error('Database connection failed. Check MONGODB_URI in .env and your Atlas network access list.');
    console.error(err.message);
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 3000;
  const server = createApp().listen(port, () => {
    console.log(`StudyQuest is running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await closeDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
