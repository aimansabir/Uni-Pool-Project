const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { authenticate } = require('./middlewares/auth.middleware');
const { addClient, removeClient } = require('./lib/sseHub');

const authRoutes = require('./routes/auth.routes');
const searchRoutes = require('./routes/search.routes');
const bookingRequestRoutes = require('./routes/bookingRequest.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'UniPool API is running 🚗' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/booking-requests', bookingRequestRoutes);

// SSE notification stream — real-time push for authenticated users
app.get('/api/notifications/stream', authenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':\n\n'); // SSE comment — keeps connection alive

  const userId = req.user.id;
  addClient(userId, res);

  req.on('close', () => {
    removeClient(userId, res);
  });
});

// 404 + error handlers (MUST be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;