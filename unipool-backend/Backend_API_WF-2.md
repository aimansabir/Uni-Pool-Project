# UniPool Backend – API Quick Reference (Workflow 2)

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

### Search (Smart Search & Live Feed)

| Method | Endpoint                            | Description                                    |
| ------ | ----------------------------------- | ---------------------------------------------- |
| GET    | `/api/search/rides`                 | Smart search with pickup, dropoff, slot & urgency filters |
| GET    | `/api/search/rides/:rideId/preview` | Detailed ride preview with route, stops & occupancy |

**Search Query Parameters:**

| Parameter    | Type    | Description                                                    |
| ------------ | ------- | -------------------------------------------------------------- |
| `pickup`     | string  | Pickup keyword (matches start location, route key, stop names) |
| `dropoff`    | string  | Drop-off keyword (matches destination, destination key, stops) |
| `targetSlot` | string  | Target class slot (e.g., "08:30 AM")                           |
| `rideType`   | string  | `SCHEDULED` or `INSTANT`                                       |
| `onlyUrgent` | boolean | Show only urgent "Leaving Now" rides                           |

### Booking Requests (Full CRUD)

| Method | Endpoint                             | Description                          |
| ------ | ------------------------------------ | ------------------------------------ |
| POST   | `/api/booking-requests`              | Request a seat on a ride             |
| GET    | `/api/booking-requests`              | List passenger's booking requests    |
| GET    | `/api/booking-requests/incoming`     | Driver lists incoming booking requests |
| GET    | `/api/booking-requests/:id`          | Get a specific booking request       |
| PATCH  | `/api/booking-requests/:id/respond`  | Driver accepts or rejects a request  |
| PATCH  | `/api/booking-requests/:id/cancel`   | Passenger cancels their booking      |
| DELETE | `/api/booking-requests/:id`          | Delete a non-accepted booking        |

**Booking Creation Validation:**

- `pickupStopId` is **required**
- `dropStopId` is optional
- Only **one seat** per booking request is allowed
- Pickup and drop must follow route order (pickup sequence < drop sequence)

**Respond / Cancel Notes:**

- Accept can return `409 Conflict` if another request already took the last seat
- Cancel is allowed only before ride start
- Cancelling an accepted booking restores the seat for other passengers

### Real-Time Notifications (SSE)

| Method | Endpoint                        | Description                           |
| ------ | ------------------------------- | ------------------------------------- |
| GET    | `/api/notifications/stream`     | SSE stream for live push to driver    |

Instant ride booking alerts are pushed to the driver in real time via Server-Sent Events.

---

## Environment Variables

| Variable       | Required | Description                      |
| -------------- | -------- | -------------------------------- |
| `DATABASE_URL` | ✅       | PostgreSQL connection string     |
| `JWT_SECRET`   | ✅       | Secret for JWT signing           |
| `PORT`         | ❌       | Server port (default: 3000)      |

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
