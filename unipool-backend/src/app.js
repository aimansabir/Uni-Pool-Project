const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { authenticate } = require('./middlewares/auth.middleware');
const { addClient, removeClient } = require('./lib/sseHub');

// Workflow 1 routes
const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const rideRoutes = require('./routes/ride.routes');
const notificationRoutes = require('./routes/notification.routes');
const activeSearchRoutes = require('./routes/activeSearch.routes');
const routeSubscriptionRoutes = require('./routes/routeSubscription.routes');

// Workflow 2 routes
const searchRoutes = require('./routes/search.routes');
const bookingRequestRoutes = require('./routes/bookingRequest.routes');

// Workflow 3 routes
const rideExecutionRoutes = require('./routes/rideExecution.routes');
const paymentRoutes = require('./routes/payment.routes');
const ratingRoutes = require('./routes/rating.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'UniPool API is running 🚗' });
});

// Mount routes — Workflow 1
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/active-searches', activeSearchRoutes);
app.use('/api/route-subscriptions', routeSubscriptionRoutes);

// Mount routes — Workflow 2
app.use('/api/search', searchRoutes);
app.use('/api/booking-requests', bookingRequestRoutes);

// Mount routes — Workflow 3
app.use('/api/ride-execution', rideExecutionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);

// SSE notification stream — real-time push for authenticated users
app.get('/api/notifications/stream', authenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':\n\n');

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
