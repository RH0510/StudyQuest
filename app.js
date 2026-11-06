const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { authenticateRequest } = require('./middleware/auth');
const { verifyCsrf } = require('./middleware/csrf');
const { rejectMongoOperators } = require('./middleware/validateInput');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const deadlineRoutes = require('./routes/deadlines');
const sessionRoutes = require('./routes/sessions');
const rewardRoutes = require('./routes/rewards');
const dashboardRoutes = require('./routes/dashboard');
const periodRoutes = require('./routes/periods');
const moduleRoutes = require('./routes/modules');

// Pages handled by the browser router in public/js/app.js.
const PAGE_ROUTES = [
  '/', '/login', '/register', '/dashboard', '/tasks', '/deadlines', '/timer',
  '/rewards', '/profile', '/settings', '/privacy',
];

function createApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers (Section 4.8). Everything, including fonts and icons, is served from this app.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }));

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(rejectMongoOperators);
  api.use(verifyCsrf);
  api.use('/auth', authRoutes);
  api.use('/users', authenticateRequest, userRoutes);
  api.use('/tasks', authenticateRequest, taskRoutes);
  api.use('/deadlines', authenticateRequest, deadlineRoutes);
  api.use('/sessions', authenticateRequest, sessionRoutes);
  api.use('/rewards', authenticateRequest, rewardRoutes);
  api.use('/dashboard', authenticateRequest, dashboardRoutes);
  api.use('/periods', authenticateRequest, periodRoutes);
  api.use('/modules', authenticateRequest, moduleRoutes);
  api.use(apiNotFound);
  app.use('/api', api);

  app.use('/fonts', express.static(path.join(__dirname, 'node_modules', '@fontsource', 'poppins', 'files'), { maxAge: '30d' }));
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  app.get(PAGE_ROUTES, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
