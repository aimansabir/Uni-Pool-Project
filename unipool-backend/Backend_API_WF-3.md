# UniPool Backend – API Quick Reference (Workflow 3)

> Full documentation with setup instructions, request/response examples, and database schema is in [README.md](./README.md).

---

## Base URL

```
http://localhost:3000
```

## Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require:

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### Auth

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| POST   | `/api/auth/register` | Register a new user   |
| POST   | `/api/auth/login`    | Login & receive JWT   |
| GET    | `/api/auth/me`       | Get current user      |

### Ride Execution (Lifecycle)

| Method | Endpoint                                               | Description                     |
| ------ | ------------------------------------------------------ | ------------------------------- |
| PATCH  | `/api/ride-execution/rides/:rideId/start`              | Start a ride                    |
| GET    | `/api/ride-execution/rides/:rideId/navigation`         | Get Google Maps navigation link |
| PATCH  | `/api/ride-execution/rides/:rideId/location`           | Update driver's live location   |
| GET    | `/api/ride-execution/rides/:rideId/track`              | Get real-time tracking data     |
| PATCH  | `/api/ride-execution/rides/:rideId/complete`           | Complete a ride                 |

### Ride Execution (Passenger Management)

| Method | Endpoint                                                       | Description                 |
| ------ | -------------------------------------------------------------- | --------------------------- |
| PATCH  | `/api/ride-execution/bookings/:bookingRequestId/verify-plate`  | Passenger verifies plate    |
| PATCH  | `/api/ride-execution/bookings/:bookingRequestId/arrived-at-stop` | Driver marks arrival at stop |
| PATCH  | `/api/ride-execution/bookings/:bookingRequestId/pickup`        | Mark passenger picked up    |
| PATCH  | `/api/ride-execution/bookings/:bookingRequestId/no-show`       | Mark passenger as no-show   |
| PATCH  | `/api/ride-execution/bookings/:bookingRequestId/drop-off`      | Mark passenger dropped off  |

### Payments

| Method | Endpoint                              | Description                      |
| ------ | ------------------------------------- | -------------------------------- |
| GET    | `/api/payments/rides/:rideId/due`     | Get payments due for a ride      |
| PATCH  | `/api/payments/:paymentId/mark-paid`  | Passenger records payment method |
| PATCH  | `/api/payments/:paymentId/confirm`    | Driver confirms payment received |

### Ratings (Full CRUD)

| Method | Endpoint                                   | Description                      |
| ------ | ------------------------------------------ | -------------------------------- |
| POST   | `/api/ratings/passenger-to-driver`         | Passenger rates driver           |
| POST   | `/api/ratings/driver-to-passenger`         | Driver rates passenger           |
| GET    | `/api/ratings`                             | List my ratings (given/received) |
| GET    | `/api/ratings/:id`                         | Get a single rating              |
| GET    | `/api/ratings/users/:userId/trust-score`   | Get public trust score           |
| PUT    | `/api/ratings/:id`                         | Update a rating                  |
| DELETE | `/api/ratings/:id`                         | Delete a rating                  |

---

## Environment Variables

| Variable                   | Required | Description                                |
| -------------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`             | ✅       | PostgreSQL connection string               |
| `JWT_SECRET`               | ✅       | Secret for JWT signing                     |
| `PORT`                     | ❌       | Server port (default: 3000)                |
| `APP_BASE_URL`             | ❌       | Base URL for tracking links (optional)     |
| `ROUTE_GEOCODER_BASE_URL`  | ❌       | Nominatim API URL                          |
| `ROUTE_ENGINE_BASE_URL`    | ❌       | OSRM routing engine URL                    |
| `NOMINATIM_EMAIL`          | ❌       | Email for Nominatim compliance             |
| `NOMINATIM_USER_AGENT`     | ❌       | User-Agent for Nominatim                   |
| `FARE_BASE_PKR`            | ❌       | Base fare (default: 60)                    |
| `FARE_PER_KM_PKR`          | ❌       | Per-km fare (default: 18)                  |
| `FARE_MAX_MULTIPLIER`      | ❌       | Max fare multiplier (default: 1.25)        |
| `LANDMARK_RADIUS_METERS`   | ❌       | Landmark detection radius (default: 700)   |
| `SMTP_HOST`                | ❌       | SMTP server for emails                     |
| `SMTP_PORT`                | ❌       | SMTP port (default: 587)                   |
| `SMTP_SECURE`              | ❌       | Use TLS (default: false)                   |
| `SMTP_USER`                | ❌       | SMTP username                              |
| `SMTP_PASS`                | ❌       | SMTP password                              |
| `SMTP_FROM`                | ❌       | Email "From" address                       |

---

## Setup (Quick)

```bash
cd unipool-backend
npm install
cp .env.example .env        # Edit with your database credentials
npx prisma migrate dev --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
npm run dev
```
