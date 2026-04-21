const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const rideRoutes = require('./routes/ride.routes');
const notificationRoutes = require('./routes/notification.routes');
const activeSearchRoutes = require('./routes/activeSearch.routes');
const routeSubscriptionRoutes = require('./routes/routeSubscription.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'UniPool API is running 🚗' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/active-searches', activeSearchRoutes);
app.use('/api/route-subscriptions', routeSubscriptionRoutes);

// 404 + error handlers (MUST be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;