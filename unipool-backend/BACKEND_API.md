# UniPool Backend – API Quick Reference

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

### Vehicles (Full CRUD)

| Method | Endpoint              | Description             |
| ------ | --------------------- | ----------------------- |
| POST   | `/api/vehicles`       | Add a vehicle           |
| GET    | `/api/vehicles`       | List my vehicles        |
| GET    | `/api/vehicles/:id`   | Get vehicle by ID       |
| PUT    | `/api/vehicles/:id`   | Update a vehicle        |
| DELETE | `/api/vehicles/:id`   | Delete a vehicle        |

### Rides (Full CRUD)

| Method | Endpoint                           | Description                |
| ------ | ---------------------------------- | -------------------------- |
| POST   | `/api/rides/intelligence/preview`  | Preview route intelligence |
| POST   | `/api/rides`                       | Publish a new ride         |
| GET    | `/api/rides`                       | List my rides              |
| GET    | `/api/rides/:id`                   | Get ride by ID             |
| PUT    | `/api/rides/:id`                   | Update a ride              |
| DELETE | `/api/rides/:id`                   | Delete a ride              |

### Route Subscriptions

| Method | Endpoint                        | Description              |
| ------ | ------------------------------- | ------------------------ |
| POST   | `/api/route-subscriptions`      | Subscribe to a route     |
| GET    | `/api/route-subscriptions`      | List my subscriptions    |
| DELETE | `/api/route-subscriptions/:id`  | Delete a subscription    |

### Active Route Searches

| Method | Endpoint                                | Description               |
| ------ | --------------------------------------- | ------------------------- |
| POST   | `/api/active-searches`                  | Register active search    |
| PATCH  | `/api/active-searches/:id/ping`         | Heartbeat (keep alive)    |
| PATCH  | `/api/active-searches/:id/deactivate`   | Deactivate search         |

### Notifications

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/notifications`            | List my notifications          |
| PATCH  | `/api/notifications/:id/read`   | Mark notification as read      |
| GET    | `/api/notifications/stream`     | SSE real-time stream           |

---

## Environment Variables

| Variable                   | Required | Description                                |
| -------------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`             | ✅       | PostgreSQL connection string               |
| `JWT_SECRET`               | ✅       | Secret for JWT signing                     |
| `PORT`                     | ❌       | Server port (default: 3000)                |
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