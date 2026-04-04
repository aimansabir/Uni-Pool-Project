# UniPool Backend

> **University Carpooling Platform – Backend API**
> A RESTful backend for UniPool, a ride-sharing web app exclusively for IBA University students. Built with **Express.js**, **PostgreSQL**, and **Prisma ORM**.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running the Server](#running-the-server)
7. [Project Structure](#project-structure)
8. [Implemented Workflows (CRUD Flows)](#implemented-workflows-crud-flows)
9. [API Documentation](#api-documentation)
   - [Authentication](#1-authentication)
   - [Ride Execution (Lifecycle)](#2-ride-execution-lifecycle---workflow-3)
   - [Ride Execution (Passenger Mgmt)](#3-ride-execution-passenger-management---workflow-3)
   - [Payments](#4-payments---workflow-3)
   - [Ratings (Full CRUD)](#5-ratings-full-crud---workflow-3)
10. [Database Schema (ERD)](#database-schema-erd)
11. [Version Control Practices](#version-control-practices)

---

## Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Runtime    | Node.js                 |
| Framework  | Express.js v5           |
| Database   | PostgreSQL              |
| ORM        | Prisma v6               |
| Auth       | JWT (jsonwebtoken)      |
| Hashing    | bcryptjs                |
| Mapping    | Nominatim + OSRM        |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 18.x – [Download](https://nodejs.org/)
- **npm** ≥ 9.x (ships with Node.js)
- **PostgreSQL** ≥ 14.x – [Download](https://www.postgresql.org/download/)
- **Git** – [Download](https://git-scm.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/aimansabir/Uni-Pool-Project.git
cd Uni-Pool-Project/unipool-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual database credentials and settings (see [Environment Variables](#environment-variables) below).

### 4. Create the PostgreSQL Database

```sql
-- In psql or pgAdmin:
CREATE DATABASE unipool_db;
```

### 5. Run Prisma Migrations

This will create all tables in your database:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma
```

### 6. Generate the Prisma Client

```bash
npx prisma generate --schema=./prisma/schema.prisma
```

### 7. Start the Development Server

```bash
npm run dev
```

The server will start at **http://localhost:3000** (or the port specified in `.env`).

Verify by visiting:

```
GET http://localhost:3000/
```

Expected response:

```json
{
  "success": true,
  "message": "UniPool API is running 🚗"
}
```

---

## Environment Variables

Create a `.env` file in the `unipool-backend/` directory. A `.env.example` file is provided as a template.

| Variable                   | Required | Default                                | Description                                        |
| -------------------------- | -------- | -------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`             | ✅       | —                                      | PostgreSQL connection string                        |
| `JWT_SECRET`               | ✅       | —                                      | Secret key for signing JWT tokens                   |
| `PORT`                     | ❌       | `3000`                                 | Port the server listens on                          |
| `APP_BASE_URL`             | ❌       | —                                      | Base URL for ride tracking links (e.g. `http://localhost:3000`) |
| `ROUTE_GEOCODER_BASE_URL`  | ❌       | `https://nominatim.openstreetmap.org`  | Nominatim geocoding API base URL                    |
| `ROUTE_ENGINE_BASE_URL`    | ❌       | `https://router.project-osrm.org`     | OSRM routing engine base URL                        |
| `NOMINATIM_EMAIL`          | ❌       | —                                      | Email for Nominatim usage policy compliance         |
| `NOMINATIM_USER_AGENT`     | ❌       | `uni-pool-backend/1.0`                | User-Agent header for Nominatim requests            |
| `FARE_BASE_PKR`            | ❌       | `60`                                   | Base fare in PKR for fare calculation               |
| `FARE_PER_KM_PKR`          | ❌       | `18`                                   | Per-kilometer fare rate in PKR                      |
| `FARE_MAX_MULTIPLIER`      | ❌       | `1.25`                                 | Maximum multiplier over suggested fare (fare cap)   |
| `LANDMARK_RADIUS_METERS`   | ❌       | `700`                                  | Radius to detect landmarks along a route            |
| `SMTP_HOST`                | ❌       | —                                      | SMTP server host for email notifications            |
| `SMTP_PORT`                | ❌       | `587`                                  | SMTP server port                                    |
| `SMTP_SECURE`              | ❌       | `false`                                | Use TLS for SMTP                                    |
| `SMTP_USER`                | ❌       | —                                      | SMTP authentication username                        |
| `SMTP_PASS`                | ❌       | —                                      | SMTP authentication password                        |
| `SMTP_FROM`                | ❌       | `UniPool <no-reply@unipool.local>`    | "From" address for outgoing emails                  |

**Example `DATABASE_URL`:**

```
postgresql://postgres:your_password@localhost:5432/unipool_db
```

---

## Database Setup

### PostgreSQL Installation

1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. Start the PostgreSQL service
3. Create the database:

```bash
psql -U postgres
CREATE DATABASE unipool_db;
\q
```

### Running Migrations

Prisma manages the database schema through migrations. The following migrations are included:

| Migration                                          | Description                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `init_user_auth`                                   | Creates User table with auth fields                                    |
| `workflow3_ride_execution_payment_rating`           | Adds ride execution, payment, and rating models for WF3                |
| `workflow3_fix_alignment` (×2)                      | Schema alignment fixes for WF3 compatibility                           |
| `workflow3_part1`                                  | Full WF3 schema: Vehicle, Ride, RideStop, BookingRequest, RidePayment, RideRating, RouteSubscription, ActiveRouteSearch, Notification with all enums |
| `notification_pending_default`                     | Sets PENDING as default notification status                            |

Apply all migrations:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma
```

### Prisma Studio (Optional)

To visually inspect and edit database records:

```bash
npx prisma studio
```

---

## Running the Server

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start dev server with hot-reload (nodemon) |
| `npm start`      | Start production server              |
| `npm run prisma:validate` | Validate the Prisma schema  |
| `npm run prisma:generate` | Generate Prisma Client      |
| `npm run prisma:migrate`  | Run database migrations     |

---

## Project Structure

```
unipool-backend/
├── prisma/
│   ├── schema.prisma                 # Database schema (models, enums, relations)
│   └── migrations/                   # Auto-generated migration SQL files
├── src/
│   ├── server.js                     # Entry point – loads env, starts HTTP server
│   ├── app.js                        # Express app – mounts middleware & routes
│   ├── routes/
│   │   ├── auth.routes.js            # POST /register, /login, GET /me
│   │   ├── rideExecution.routes.js   # Ride lifecycle + passenger pickup/no-show/drop
│   │   ├── payment.routes.js         # Payment due, mark-paid, confirm
│   │   └── rating.routes.js          # Full CRUD for ratings + trust score
│   ├── services/                     # Business logic layer (no HTTP awareness)
│   │   ├── auth.service.js           # Register, login, getMe
│   │   ├── rideExecution.service.js  # Start ride, location, tracking, pickup, no-show, drop-off, complete
│   │   ├── payment.service.js        # Payment due check, mark paid, driver confirm
│   │   └── rating.service.js         # Mutual ratings CRUD + trust score recalculation
│   ├── middlewares/
│   │   ├── auth.middleware.js        # JWT token verification
│   │   └── error.middleware.js       # 404 handler + global error handler
│   ├── lib/
│   │   └── prisma.js                 # Prisma Client singleton
│   └── utils/
│       └── response.js              # Standardized JSON response helpers
├── .env.example                      # Template for environment variables
├── .gitignore                        # Ignores node_modules/ and .env
├── Backend_API_WF-3.md               # API Quick Reference for Workflow 3
├── package.json                      # Dependencies and npm scripts
└── README.md                         # This file
```

### Architecture Overview

The backend follows a **modular, layered architecture**:

```
Routes (HTTP layer) → Services (Business logic) → Prisma (Database layer)
```

- **Routes** – Handle HTTP requests/responses, input parsing, and call the appropriate service.
- **Services** – Contain all business logic, validation, and database operations via Prisma.
- **Middlewares** – Cross-cutting concerns (authentication, error handling).
- **Utils** – Shared helper functions (response formatting).
- **Lib** – Singleton instances (Prisma client).

---

## Implemented Workflows (CRUD Flows)

> **Note:** As per the Milestone 3 rubric, login/register flows do not count toward the two required distinct workflows.

### Workflow 3 — Live Navigation & Trust Cycle

This workflow covers the **complete execution of a ride**, incorporating real-time location tools, pickup verification, no-show handling, cash settlement, and the post-ride reputation system. It implements CRUD for two core entities: **RidePayment** and **RideRating**.

#### Sub-Flow 1: Ride Start & Live Navigation

| Step | Actor    | Action                                                     |
| ---- | -------- | ---------------------------------------------------------- |
| 1    | Driver   | Taps "Start Ride" → `PATCH /rides/:rideId/start`          |
| 2    | System   | Ride status changes to `IN_PROGRESS`, payment records created |
| 3    | System   | Google Maps deep link generated with pre-filled waypoints  |
| 4    | Driver   | Updates live location → `PATCH /rides/:rideId/location`    |
| 5    | Passenger| Tracks driver's real-time location → `GET /rides/:rideId/track` |

#### Sub-Flow 2: Pickup Verification & No-Show Handling

| Step | Actor     | Action                                                             |
| ---- | --------- | ------------------------------------------------------------------ |
| 1    | Driver    | Marks arrival at stop → `PATCH /bookings/:id/arrived-at-stop`     |
| 2    | Passenger | Verifies car plate → `PATCH /bookings/:id/verify-plate`           |
| 3    | Driver    | Marks passenger picked up → `PATCH /bookings/:id/pickup`          |
| 4    | Driver    | OR after 5 min wait, marks no-show → `PATCH /bookings/:id/no-show`|

#### Sub-Flow 3: Arrival & Payment Settlement

| Step | Actor     | Action                                                             |
| ---- | --------- | ------------------------------------------------------------------ |
| 1    | Driver    | Drops off passenger → `PATCH /bookings/:id/drop-off`              |
| 2    | Passenger | Views payment due → `GET /payments/rides/:rideId/due`             |
| 3    | Passenger | Records payment method → `PATCH /payments/:paymentId/mark-paid`   |
| 4    | Driver    | Confirms receipt → `PATCH /payments/:paymentId/confirm`           |

#### Sub-Flow 4: Completion & Trust Score

| Step | Actor     | Action                                                             |
| ---- | --------- | ------------------------------------------------------------------ |
| 1    | Driver    | Completes ride → `PATCH /rides/:rideId/complete`                  |
| 2    | Passenger | Rates driver (Punctuality + Safety) → `POST /ratings/passenger-to-driver` |
| 3    | Driver    | Rates passenger (Behavior) → `POST /ratings/driver-to-passenger`  |
| 4    | System    | Trust scores automatically recalculated and updated on user profile |

#### Rating Management (Full CRUD)

| Operation  | Method | Endpoint                                   | Description                      |
| ---------- | ------ | ------------------------------------------ | -------------------------------- |
| **Create** | POST   | `/api/ratings/passenger-to-driver`         | Passenger rates driver           |
| **Create** | POST   | `/api/ratings/driver-to-passenger`         | Driver rates passenger           |
| **Read**   | GET    | `/api/ratings`                             | List ratings (filterable)        |
| **Read**   | GET    | `/api/ratings/:id`                         | Get single rating                |
| **Read**   | GET    | `/api/ratings/users/:userId/trust-score`   | Get public trust score           |
| **Update** | PUT    | `/api/ratings/:id`                         | Update a rating (rater only)     |
| **Delete** | DELETE | `/api/ratings/:id`                         | Delete a rating (rater only)     |

#### Payment Management

| Operation   | Method | Endpoint                              | Description                      |
| ----------- | ------ | ------------------------------------- | -------------------------------- |
| **Read**    | GET    | `/api/payments/rides/:rideId/due`     | Get payments due for a ride      |
| **Update**  | PATCH  | `/api/payments/:paymentId/mark-paid`  | Passenger records payment        |
| **Update**  | PATCH  | `/api/payments/:paymentId/confirm`    | Driver confirms payment received |

---

## API Documentation

All endpoints return consistent JSON responses:

**Success Response:**
```json
{
  "success": true,
  "message": "Descriptive message.",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description.",
  "data": null,
  "errors": null
}
```

**Authentication:** All endpoints (except register/login) require a JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 1. Authentication

#### `POST /api/auth/register`

Register a new user (IBA email required).

**Request Body:**
```json
{
  "fullName": "Ali Ahmed",
  "ibaEmail": "ali.ahmed@khi.iba.edu.pk",
  "password": "securePassword123",
  "phone": "03001234567",
  "studentErp": "12345",
  "gender": "male"
}
```

**Validations:**
- `fullName`, `ibaEmail`, `password`, `gender` are required
- Email must end with `@iba.edu.pk` or `@khi.iba.edu.pk`
- Duplicate emails are rejected (409)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "id": "uuid",
    "fullName": "Ali Ahmed",
    "ibaEmail": "ali.ahmed@khi.iba.edu.pk",
    "gender": "male",
    "role": "student"
  }
}
```

---

#### `POST /api/auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "ibaEmail": "ali.ahmed@khi.iba.edu.pk",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "fullName": "Ali Ahmed",
      "ibaEmail": "ali.ahmed@khi.iba.edu.pk",
      "gender": "male",
      "role": "student",
      "trustScore": 100
    }
  }
}
```

---

#### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User fetched successfully.",
  "data": {
    "id": "uuid",
    "fullName": "Ali Ahmed",
    "ibaEmail": "ali.ahmed@khi.iba.edu.pk",
    "gender": "male",
    "role": "student",
    "trustScore": 100
  }
}
```

---

### 2. Ride Execution (Lifecycle) — Workflow 3

> All ride execution endpoints require authentication.

#### `PATCH /api/ride-execution/rides/:rideId/start`

Start a published ride. Transitions ride to `IN_PROGRESS`, sets all accepted bookings to `BOOKED` participant status, creates `RidePayment` records for each accepted passenger, and sends "Ride Started!" notifications.

**Validations:**
- Only the ride owner (driver) can start the ride
- Ride must be in `PUBLISHED` status
- At least one accepted booking must exist

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride started successfully.",
  "data": {
    "ride": {
      "id": "uuid",
      "status": "IN_PROGRESS",
      "startedAt": "2026-04-05T07:45:00.000Z",
      "...other ride fields..."
    },
    "navigationLink": "https://www.google.com/maps/dir/?api=1&origin=24.92,67.09&destination=24.83,67.03&waypoints=24.91,67.09",
    "trackUrl": "/api/ride-execution/rides/uuid/track",
    "acceptedPassengers": 2,
    "waypoints": [
      { "id": "uuid", "stopName": "Nipa Chowrangi", "sequence": 1, "lat": 24.9178, "lng": 67.0971 }
    ]
  }
}
```

---

#### `GET /api/ride-execution/rides/:rideId/navigation`

Get the Google Maps deep link for navigation with pre-filled waypoints.

**Validations:**
- Only the ride owner (driver) can access navigation

**Success Response (200):**
```json
{
  "success": true,
  "message": "Navigation link generated.",
  "data": {
    "navigationLink": "https://www.google.com/maps/dir/?api=1&origin=24.92,67.09&destination=24.83,67.03",
    "waypoints": [
      { "id": "uuid", "stopName": "Maskan Gate", "sequence": 1, "lat": 24.92, "lng": 67.09 }
    ]
  }
}
```

---

#### `PATCH /api/ride-execution/rides/:rideId/location`

Update the driver's live GPS location during an in-progress ride.

**Request Body:**
```json
{
  "lat": 24.9178,
  "lng": 67.0971
}
```

**Validations:**
- Only the ride owner (driver) can update location
- Ride must be `IN_PROGRESS`
- `lat` and `lng` are required and must be numbers

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location updated.",
  "data": {
    "currentLat": 24.9178,
    "currentLng": 67.0971,
    "lastLocationAt": "2026-04-05T08:00:00.000Z"
  }
}
```

---

#### `GET /api/ride-execution/rides/:rideId/track`

Get real-time tracking data for a ride. Available to both the driver and accepted passengers.

**Validations:**
- Must be the driver or an accepted passenger
- Ride cannot be `CANCELLED`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tracking data retrieved.",
  "data": {
    "rideId": "uuid",
    "status": "IN_PROGRESS",
    "driver": {
      "id": "uuid",
      "fullName": "Ali Ahmed",
      "phone": "03001234567"
    },
    "vehicle": {
      "make": "Toyota",
      "model": "Corolla",
      "color": "White",
      "registrationNumber": "ABC-1234"
    },
    "currentLat": 24.9178,
    "currentLng": 67.0971,
    "lastLocationAt": "2026-04-05T08:00:00.000Z",
    "estimatedArrivalMinutes": 28,
    "stops": [
      { "id": "uuid", "stopName": "Nipa Chowrangi", "sequence": 1, "lat": 24.9178, "lng": 67.0971 }
    ],
    "startedAt": "2026-04-05T07:45:00.000Z",
    "departureTime": "2026-04-05T07:45:00.000Z"
  }
}
```

---

#### `PATCH /api/ride-execution/rides/:rideId/complete`

Complete a ride. All remaining `PICKED_UP` passengers are auto-dropped off. Sends "Ride Completed" notifications prompting ratings.

**Validations:**
- Only the ride owner (driver) can complete the ride
- Ride must be `IN_PROGRESS`
- All accepted passengers must be either `PICKED_UP`, `DROPPED_OFF`, or `NO_SHOW` (none in `BOOKED` status)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride completed successfully.",
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "completedAt": "2026-04-05T09:00:00.000Z",
    "...other ride fields..."
  }
}
```

---

### 3. Ride Execution (Passenger Management) — Workflow 3

#### `PATCH /api/ride-execution/bookings/:bookingRequestId/verify-plate`

Passenger verifies the vehicle's license plate before boarding.

**Validations:**
- Only the booking passenger can verify
- Booking must be in `ACCEPTED` status
- Cannot verify if already `NO_SHOW` or `DROPPED_OFF`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Plate verified successfully.",
  "data": {
    "id": "uuid",
    "plateVerified": true,
    "plateVerifiedAt": "2026-04-05T08:05:00.000Z"
  }
}
```

---

#### `PATCH /api/ride-execution/bookings/:bookingRequestId/arrived-at-stop`

Driver marks arrival at a passenger's pickup stop. This starts the 5-minute no-show timer.

**Validations:**
- Only the ride driver can mark arrival
- Ride must be `IN_PROGRESS`
- Booking must be `ACCEPTED` with participant status `BOOKED`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Arrival at stop recorded.",
  "data": {
    "id": "uuid",
    "arrivedAtStopAt": "2026-04-05T08:10:00.000Z"
  }
}
```

---

#### `PATCH /api/ride-execution/bookings/:bookingRequestId/pickup`

Driver confirms passenger has boarded the vehicle.

**Validations:**
- Only the ride driver can mark pickup
- Ride must be `IN_PROGRESS`
- Booking must be `ACCEPTED` with participant status `BOOKED`
- **Passenger must have verified the plate first** (`plateVerified: true`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Passenger picked up.",
  "data": {
    "id": "uuid",
    "participantStatus": "PICKED_UP",
    "pickedUpAt": "2026-04-05T08:12:00.000Z"
  }
}
```

---

#### `PATCH /api/ride-execution/bookings/:bookingRequestId/no-show`

Driver marks a passenger as a no-show after waiting at least 5 minutes. Sends a notification to the passenger.

**Validations:**
- Only the ride driver can mark no-show
- Ride must be `IN_PROGRESS`
- Booking must be `ACCEPTED` with participant status `BOOKED`
- **Driver must have marked arrival at stop first** (`arrivedAtStopAt` must exist)
- **At least 5 minutes must have passed** since `arrivedAtStopAt`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Passenger marked as no-show.",
  "data": {
    "id": "uuid",
    "participantStatus": "NO_SHOW",
    "noShowMarkedAt": "2026-04-05T08:16:00.000Z"
  }
}
```

---

#### `PATCH /api/ride-execution/bookings/:bookingRequestId/drop-off`

Driver marks a passenger as dropped off at their destination. A "Payment Due" notification is sent to the passenger.

**Validations:**
- Only the ride driver can mark drop-off
- Ride must be `IN_PROGRESS`
- Booking must be `ACCEPTED`
- **Passenger must have been picked up** (participant status `PICKED_UP`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Passenger dropped off.",
  "data": {
    "id": "uuid",
    "participantStatus": "DROPPED_OFF",
    "droppedOffAt": "2026-04-05T08:45:00.000Z"
  }
}
```

---

### 4. Payments — Workflow 3

#### `GET /api/payments/rides/:rideId/due`

Get payment records that are currently due. Drivers see all due payments for their ride; passengers see only their own.

**Key Logic:**
- Payments are only "due" when participant status is `DROPPED_OFF` or ride status is `COMPLETED`
- No-show passengers are excluded from the settlement flow

**Success Response (200) — Driver View:**
```json
{
  "success": true,
  "message": "Payment details retrieved.",
  "data": {
    "rideId": "uuid",
    "role": "driver",
    "payments": [
      {
        "id": "uuid",
        "rideId": "uuid",
        "bookingRequestId": "uuid",
        "passengerId": "uuid",
        "driverId": "uuid",
        "amount": 200,
        "paymentMethod": null,
        "status": "PENDING",
        "paidAt": null,
        "confirmedByDriverAt": null,
        "passenger": {
          "id": "uuid",
          "fullName": "Sara Khan",
          "ibaEmail": "sara.khan@khi.iba.edu.pk"
        },
        "bookingRequest": {
          "id": "uuid",
          "pickupStopName": "Nipa Chowrangi",
          "dropoffStopName": "IBA City Campus",
          "participantStatus": "DROPPED_OFF"
        }
      }
    ]
  }
}
```

---

#### `PATCH /api/payments/:paymentId/mark-paid`

Passenger reports that they have paid. Records the payment method and timestamp but does **not** change status to `PAID` — only the driver's confirmation does that.

**Request Body:**
```json
{
  "paymentMethod": "CASH"
}
```

**Valid Payment Methods:** `CASH`, `JAZZCASH`, `OTHER`

**Validations:**
- Only the passenger can mark their payment
- Payment cannot already be `PAID` or `WAIVED`
- No-show passengers cannot use this endpoint
- Payment is only markable after drop-off or ride completion

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment method recorded.",
  "data": {
    "id": "uuid",
    "paymentMethod": "CASH",
    "paidAt": "2026-04-05T09:05:00.000Z",
    "status": "PENDING"
  }
}
```

---

#### `PATCH /api/payments/:paymentId/confirm`

Driver confirms that payment has been received. This is the **only** action that changes the status to `PAID`. A notification is sent to the passenger.

**Validations:**
- Only the ride driver can confirm payment
- Payment cannot already be `PAID` or `WAIVED`
- No-show passengers cannot have payments confirmed
- Payment can only be confirmed after drop-off or ride completion

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment confirmed by driver.",
  "data": {
    "id": "uuid",
    "status": "PAID",
    "amount": 200,
    "paymentMethod": "CASH",
    "paidAt": "2026-04-05T09:05:00.000Z",
    "confirmedByDriverAt": "2026-04-05T09:06:00.000Z"
  }
}
```

---

### 5. Ratings (Full CRUD) — Workflow 3

#### `POST /api/ratings/passenger-to-driver`

Passenger submits a rating for the driver after ride completion.

**Request Body:**
```json
{
  "rideId": "uuid",
  "bookingRequestId": "uuid",
  "punctualityStars": 5,
  "safetyStars": 4,
  "comment": "Great driver, very punctual!"
}
```

**Validations:**
- Ride must be `COMPLETED`
- Booking must belong to the passenger and the ride
- Booking status must be `ACCEPTED` with participant status `DROPPED_OFF`
- Duplicate ratings for the same ride/rater/ratee/type are rejected (409)
- `punctualityStars` and `safetyStars` must be integers between 1–5

**Success Response (201):**
```json
{
  "success": true,
  "message": "Driver rating submitted successfully.",
  "data": {
    "id": "uuid",
    "rideId": "uuid",
    "bookingRequestId": "uuid",
    "raterId": "uuid",
    "rateeId": "uuid",
    "ratingType": "PASSENGER_TO_DRIVER",
    "punctualityStars": 5,
    "safetyStars": 4,
    "behaviorStars": null,
    "comment": "Great driver, very punctual!",
    "createdAt": "2026-04-05T10:00:00.000Z",
    "ride": { "id": "uuid", "status": "COMPLETED", "driverId": "uuid" },
    "rater": { "id": "uuid", "fullName": "Sara Khan", "ibaEmail": "sara.khan@khi.iba.edu.pk" },
    "ratee": { "id": "uuid", "fullName": "Ali Ahmed", "ibaEmail": "ali.ahmed@khi.iba.edu.pk" }
  }
}
```

---

#### `POST /api/ratings/driver-to-passenger`

Driver submits a behavior rating for a specific passenger after ride completion.

**Request Body:**
```json
{
  "rideId": "uuid",
  "bookingRequestId": "uuid",
  "behaviorStars": 5,
  "comment": "Very polite and on time."
}
```

**Validations:**
- Ride must be `COMPLETED`
- Only the ride driver can rate passengers
- Booking must belong to the ride with participant status `DROPPED_OFF`
- Duplicate ratings are rejected (409)
- `behaviorStars` must be an integer between 1–5

**Success Response (201):**
```json
{
  "success": true,
  "message": "Passenger rating submitted successfully.",
  "data": {
    "id": "uuid",
    "rideId": "uuid",
    "bookingRequestId": "uuid",
    "raterId": "uuid",
    "rateeId": "uuid",
    "ratingType": "DRIVER_TO_PASSENGER",
    "punctualityStars": null,
    "safetyStars": null,
    "behaviorStars": 5,
    "comment": "Very polite and on time.",
    "createdAt": "2026-04-05T10:05:00.000Z",
    "ride": { "id": "uuid", "status": "COMPLETED", "driverId": "uuid" },
    "rater": { "id": "uuid", "fullName": "Ali Ahmed", "ibaEmail": "ali.ahmed@khi.iba.edu.pk" },
    "ratee": { "id": "uuid", "fullName": "Sara Khan", "ibaEmail": "sara.khan@khi.iba.edu.pk" }
  }
}
```

---

#### `GET /api/ratings`

List all ratings involving the authenticated user. Supports filtering.

**Query Parameters:**

| Parameter    | Type   | Description                                          |
| ------------ | ------ | ---------------------------------------------------- |
| `rideId`     | string | Filter by a specific ride                            |
| `ratingType` | string | `PASSENGER_TO_DRIVER` or `DRIVER_TO_PASSENGER`      |
| `as`         | string | `given`, `received`, or `all` (default: `all`)       |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ratings retrieved successfully.",
  "data": {
    "count": 3,
    "filters": {
      "rideId": null,
      "ratingType": null,
      "as": "all"
    },
    "ratings": [
      {
        "id": "uuid",
        "ratingType": "PASSENGER_TO_DRIVER",
        "punctualityStars": 5,
        "safetyStars": 4,
        "behaviorStars": null,
        "comment": "Great driver!",
        "createdAt": "2026-04-05T10:00:00.000Z",
        "rater": { "id": "uuid", "fullName": "Sara Khan" },
        "ratee": { "id": "uuid", "fullName": "Ali Ahmed" }
      }
    ]
  }
}
```

---

#### `GET /api/ratings/:id`

Get a single rating by ID (must be the rater or ratee).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Rating retrieved successfully.",
  "data": {
    "id": "uuid",
    "ratingType": "PASSENGER_TO_DRIVER",
    "punctualityStars": 5,
    "safetyStars": 4,
    "behaviorStars": null,
    "comment": "Great driver!",
    "...includes ride, rater, ratee..."
  }
}
```

---

#### `GET /api/ratings/users/:userId/trust-score`

Get a user's public trust score breakdown.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Trust score retrieved.",
  "data": {
    "id": "uuid",
    "fullName": "Ali Ahmed",
    "trustScore": "90%",
    "punctualityScore": "92%",
    "safetyScore": "88%",
    "behaviorScore": null,
    "totalRatingsReceived": 5
  }
}
```

**Trust Score Calculation:**
- Scores are computed as percentages: `(average_stars / 5) × 100`
- `punctualityScore` = average of all `punctualityStars` received
- `safetyScore` = average of all `safetyStars` received
- `behaviorScore` = average of all `behaviorStars` received
- `trustScore` = average of all non-null sub-scores
- Default trust score for new users: `100`

---

#### `PUT /api/ratings/:id`

Update a previously submitted rating. Only the original rater can update.

**Request Body (Passenger-to-Driver):**
```json
{
  "punctualityStars": 4,
  "safetyStars": 5,
  "comment": "Updated my review."
}
```

**Request Body (Driver-to-Passenger):**
```json
{
  "behaviorStars": 4,
  "comment": "Updated review."
}
```

**Validations:**
- Only the original rater can update
- Ride must be `COMPLETED`
- Immutable fields (`rideId`, `bookingRequestId`, `raterId`, `rateeId`, `ratingType`) cannot be changed
- Type-specific star fields are enforced (e.g., `behaviorStars` not allowed on passenger-to-driver ratings)
- Trust score is recalculated after update

**Success Response (200):**
```json
{
  "success": true,
  "message": "Rating updated successfully.",
  "data": { "...updated rating object with ride, rater, ratee..." }
}
```

---

#### `DELETE /api/ratings/:id`

Delete a previously submitted rating. Only the original rater can delete. Trust score is recalculated.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Rating deleted successfully.",
  "data": {
    "deleted": true,
    "rating": { "...deleted rating object..." }
  }
}
```

---

## Database Schema (ERD)

The following models are defined in `prisma/schema.prisma`:

```
┌─────────────────────────┐     1:N     ┌────────────────┐
│          User            │────────────▶│    Vehicle      │
│                         │             │                │
│ id (PK)                 │     1:N     │ id (PK)        │
│ fullName                │────────┐   │ driverId (FK)  │
│ ibaEmail (UQ)           │        │   │ make, model    │
│ password                │        │   │ color          │
│ phone                   │        │   │ registrationNo │
│ studentErp (UQ)         │        │   │ imageUrl       │
│ gender                  │        │   └─────┬──────────┘
│ role                    │        │         │ 1:N
│ trustScore              │        │         ▼
│ isVerified              │        │   ┌─────────────────┐
│ genderVerified          │        └──▶│      Ride        │
│ punctualityScore [WF3]  │            │                 │
│ safetyScore [WF3]       │            │ id (PK)         │
│ behaviorScore [WF3]     │            │ driverId (FK)   │
│ totalRatingsReceived    │            │ vehicleId (FK)  │
│ [WF3]                   │            │ status          │
└──────┬──────────────────┘            │ startedAt [WF3] │
       │                               │ completedAt     │
       │ 1:N                           │ [WF3]           │
       │  Payments                     │ currentLat [WF3]│
       ▼                               │ currentLng [WF3]│
┌──────────────────────┐               └──────┬──────────┘
│    RidePayment [WF3]  │                     │ 1:N
│                      │                      │
│ id (PK)              │               ┌──────┴──────────┐
│ rideId (FK)          │               │  BookingRequest  │
│ bookingRequestId (FK)│◀──────────────│                  │
│ passengerId (FK)     │   1:1         │ id (PK)          │
│ driverId (FK)        │               │ passengerId (FK) │
│ amount               │               │ rideId (FK)      │
│ paymentMethod        │               │ participantStatus│
│ status               │               │ plateVerified    │
│ paidAt               │               │ [WF3]            │
│ confirmedByDriverAt  │               │ arrivedAtStopAt  │
└──────────────────────┘               │ [WF3]            │
                                       │ pickedUpAt [WF3] │
┌──────────────────────┐               │ noShowMarkedAt   │
│   RideRating [WF3]    │               │ [WF3]            │
│                      │               │ droppedOffAt     │
│ id (PK)              │               │ [WF3]            │
│ rideId (FK)          │               └──────────────────┘
│ bookingRequestId (FK)│
│ raterId (FK)         │               ┌──────────────────┐
│ rateeId (FK)         │               │    RideStop       │
│ ratingType           │               │                  │
│ punctualityStars     │               │ id (PK)          │
│ safetyStars          │               │ rideId (FK)      │
│ behaviorStars        │               │ stopName         │
│ comment              │               │ sequence         │
└──────────────────────┘               │ lat, lng         │
                                       └──────────────────┘
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ RouteSubscription │     │ ActiveRouteSearch │     │  Notification     │
│                  │     │                  │     │                  │
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ userId (FK)      │     │ userId (FK)      │     │ userId (FK)      │
│ routeKey         │     │ routeKey         │     │ rideId (FK)      │
│ destinationKey   │     │ destinationKey   │     │ channel          │
│ channel          │     │ isActive         │     │ status           │
│ isActive         │     │ lastSeenAt       │     │ title            │
└──────────────────┘     │ deactivatedAt    │     │ message          │
                         │ [WF3]            │     │ payload (JSON)   │
                         └──────────────────┘     └──────────────────┘
```

### Enums

| Enum Name               | Values                                |
| ------------------------ | ------------------------------------- |
| `Gender`                 | `male`, `female`                      |
| `UserRole`               | `student`, `admin`                    |
| `RideType`               | `SCHEDULED`, `INSTANT`                |
| `RideStatus`             | `PUBLISHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `GenderPreference`       | `ANY`, `FEMALES_ONLY`                 |
| `BookingRequestStatus`   | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` |
| `RideParticipantStatus`  | `BOOKED`, `PICKED_UP`, `NO_SHOW`, `DROPPED_OFF` |
| `PaymentStatus`          | `PENDING`, `PAID`, `WAIVED`           |
| `PaymentMethod`          | `CASH`, `JAZZCASH`, `OTHER`           |
| `RatingType`             | `PASSENGER_TO_DRIVER`, `DRIVER_TO_PASSENGER` |
| `NotificationChannel`    | `EMAIL`, `IN_APP_TOAST`, `IN_APP`, `SSE` |
| `NotificationStatus`     | `PENDING`, `SENT`, `FAILED`, `UNREAD`, `READ` |

---

## Version Control Practices

This project follows best practices for version control:

- **Meaningful Commit Messages** – Each commit describes the specific change made (e.g., `feat: add ride execution endpoints`, `feat: implement payment settlement flow`, `feat: add mutual rating CRUD with trust score`).
- **Feature Branches** – Development is done on feature branches (e.g., `feature/workflow-3`) and merged into `main` via pull requests.
- **Pull Requests** – Code changes are reviewed through pull requests before merging to the main branch.
- **`.gitignore`** – Sensitive files (`.env`) and dependencies (`node_modules/`) are excluded from version control.
- **Final Code on `main`** – The final version of milestone code is always merged into the `main` branch.

---

## Contributors

| Khizer | Workflow-3 |

---

## License

This project is developed for academic purposes as part of the Web-Based Application Development course.
