const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

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

// 404 + error handlers (MUST be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;