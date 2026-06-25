const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const appointmentRoutes = require('./routes/appointment');
const clinicRoutes = require('./routes/clinic');
const blogRoutes = require('./routes/blog');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const resultRoutes = require('./routes/result');
const pageRoutes = require('./routes/pages');
const videoRoutes = require('./routes/videos');
const contactRoutes = require('./routes/contact');

const app = express();
const server = http.createServer(app);

const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:5500', 'http://127.0.0.1:5500'];

const io = new Server(server, {
  cors: { origin: corsOrigins, methods: ['GET', 'POST'], credentials: true }
});

connectDB();

app.set('trust proxy', 1);
app.use(helmet({
  // Allow the bundled frontend (served from this same process) to use inline
  // <script> blocks, since it ships as plain HTML/JS with no build step.
  // If you deploy the frontend separately (recommended), this has no effect there.
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(mongoSanitize());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors({ origin: corsOrigins, credentials: true }));

app.use(rateLimiter.global);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/contact', contactRoutes);

// Uploaded video/blog files saved by the admin panel
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Frontend static hosting (optional, for single-host deployments) ──
// IMPORTANT: this serves ONLY the sibling "frontend" folder — never the
// "backend" folder itself, which contains source code and secrets.
// Set SERVE_FRONTEND=false if you are hosting the frontend separately
// (e.g. Netlify/Vercel) and want this process to run as a pure API.
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const serveFrontend = process.env.SERVE_FRONTEND !== 'false' && fs.existsSync(FRONTEND_DIR);

if (serveFrontend) {
  app.use(express.static(FRONTEND_DIR));
  app.use('/', pageRoutes);
  logger.info(`Serving frontend statically from ${FRONTEND_DIR}`);
} else {
  app.get('/', (req, res) => res.json({ status: 'ok', message: 'HomoDentHealth API. Frontend is hosted separately.' }));
}

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Page not found' });
});

app.use(errorHandler);

require('./services/socket')(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  process.exit(1);
});

module.exports = { app, io };
