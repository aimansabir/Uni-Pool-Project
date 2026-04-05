# UniPool Backend — Complete API Documentation (Workflow 1 + 2 + 3)

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
   - [Vehicles (CRUD)](#2-vehicles-crud---workflow-1)
   - [Rides (CRUD)](#3-rides-crud---workflow-1)
   - [Route Intelligence](#4-route-intelligence)
   - [Route Subscriptions](#5-route-subscriptions)
   - [Active Route Searches](#6-active-route-searches)
   - [Notifications](#7-notifications)
   - [Search (Smart Search & Live Feed)](#8-search-smart-search--live-feed)
   - [Booking Requests (CRUD)](#9-booking-requests-crud)
   - [Ride Execution (Lifecycle)](#10-ride-execution-lifecycle---workflow-3)
   - [Ride Execution (Passenger Mgmt)](#11-ride-execution-passenger-management---workflow-3)
   - [Payments](#12-payments---workflow-3)
   - [Ratings (Full CRUD)](#13-ratings-full-crud---workflow-3)
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
| Email      | Nodemailer (optional)   |
| Mapping    | Nominatim + OSRM        |

---

## Prerequisites

- **Node.js** ≥ 18.x – [Download](https://nodejs.org/)
- **npm** ≥ 9.x (ships with Node.js)
- **PostgreSQL** ≥ 14.x – [Download](https://www.postgresql.org/download/)
- **Git** – [Download](https://git-scm.com/)

---

## Getting Started

```bash
git clone https://github.com/aimansabir/Uni-Pool-Project.git
cd Uni-Pool-Project/unipool-backend
npm install
cp .env.example .env        # Edit with your DB credentials
npx prisma migrate dev --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
npm run dev
```

Server starts at **http://localhost:3000**.

---

## Environment Variables

| Variable                   | Required | Default                                | Description                                        |
| -------------------------- | -------- | -------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`             | ✅       | —                                      | PostgreSQL connection string                        |
| `JWT_SECRET`               | ✅       | —                                      | Secret key for signing JWT tokens                   |
| `PORT`                     | ❌       | `3000`                                 | Port the server listens on                          |
| `APP_BASE_URL`             | ❌       | —                                      | Base URL for ride tracking links                    |
| `ROUTE_GEOCODER_BASE_URL`  | ❌       | `https://nominatim.openstreetmap.org`  | Nominatim geocoding API base URL                    |
| `ROUTE_ENGINE_BASE_URL`    | ❌       | `https://router.project-osrm.org`     | OSRM routing engine base URL                        |
| `NOMINATIM_EMAIL`          | ❌       | —                                      | Email for Nominatim usage policy compliance         |
| `NOMINATIM_USER_AGENT`     | ❌       | `uni-pool-backend/1.0`                | User-Agent header for Nominatim requests            |
| `FARE_BASE_PKR`            | ❌       | `60`                                   | Base fare in PKR                                    |
| `FARE_PER_KM_PKR`          | ❌       | `18`                                   | Per-kilometer fare rate in PKR                      |
| `FARE_MAX_MULTIPLIER`      | ❌       | `1.25`                                 | Max multiplier over suggested fare (fare cap)       |
| `LANDMARK_RADIUS_METERS`   | ❌       | `700`                                  | Radius to detect landmarks along a route            |
| `SMTP_HOST`                | ❌       | —                                      | SMTP server host for email notifications            |
| `SMTP_PORT`                | ❌       | `587`                                  | SMTP server port                                    |
| `SMTP_SECURE`              | ❌       | `false`                                | Use TLS for SMTP                                    |
| `SMTP_USER`                | ❌       | —                                      | SMTP authentication username                        |
| `SMTP_PASS`                | ❌       | —                                      | SMTP authentication password                        |
| `SMTP_FROM`                | ❌       | `UniPool <no-reply@unipool.local>`    | "From" address for outgoing emails                  |

---

## Database Setup

### Running Migrations

| Migration                              | Description                              |
| -------------------------------------- | ---------------------------------------- |
| `init_user_auth`                       | Creates User table with auth fields      |
| `wf1_vehicle_ride_ridestop`            | Adds Vehicle, Ride, and RideStop tables  |
| `cascade_delete_ridestops`             | Enables cascade delete for RideStops     |
| `wf1_intelligence_notifications`       | Route intelligence & notification models |
| `add_gender_verified_to_user`          | Gender verification flag on User         |
| `add_ride_enums`                       | Ride status, type, and preference enums  |
| `add_booking_request`                  | BookingRequest model (WF2)               |
| `workflow3_ride_execution_payment_rating` | Ride execution, payment, rating models (WF3) |
| `workflow3_part1`                      | Full WF3 schema alignment                |
| `notification_pending_default`         | Sets PENDING as default notification status |

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma
```

---

## Running the Server

| Command                   | Description                              |
| ------------------------- | ---------------------------------------- |
| `npm run dev`             | Start dev server with hot-reload (nodemon) |
| `npm start`               | Start production server                  |
| `npm run prisma:validate` | Validate the Prisma schema               |
| `npm run prisma:generate` | Generate Prisma Client                   |
| `npm run prisma:migrate`  | Run database migrations                  |

---

## Project Structure

```
unipool-backend/
├── prisma/
│   ├── schema.prisma                 # Database schema (all models & enums)
│   └── migrations/                   # Auto-generated migration SQL files
├── src/
│   ├── server.js                     # Entry point
│   ├── app.js                        # Express app – mounts all routes
│   ├── routes/
│   │   ├── auth.routes.js            # POST /register, /login, GET /me
│   │   ├── vehicle.routes.js         # Vehicle CRUD                     [WF1]
│   │   ├── ride.routes.js            # Ride CRUD + intelligence          [WF1]
│   │   ├── notification.routes.js    # GET /, PATCH /:id/read, GET /stream [WF1]
│   │   ├── activeSearch.routes.js    # POST, PATCH ping/deactivate      [WF1]
│   │   ├── routeSubscription.routes.js # POST, GET, DELETE              [WF1]
│   │   ├── search.routes.js          # GET /rides, GET /rides/:id/preview [WF2]
│   │   ├── bookingRequest.routes.js  # Full CRUD for bookings           [WF2]
│   │   ├── rideExecution.routes.js   # Ride lifecycle + passenger mgmt  [WF3]
│   │   ├── payment.routes.js         # Payment due, mark-paid, confirm  [WF3]
│   │   └── rating.routes.js          # Full CRUD + trust score          [WF3]
│   ├── services/
│   │   ├── auth.service.js           # Register, login, getMe
│   │   ├── vehicle.service.js        # Vehicle CRUD                     [WF1]
│   │   ├── ride.service.js           # Ride CRUD + intelligence         [WF1]
│   │   ├── mapping.service.js        # Geocoding, routing, landmarks    [WF1]
│   │   ├── notification.service.js   # Email + SSE toast + IN-APP       [WF1]
│   │   ├── activeSearch.service.js   # Active route search mgmt         [WF1]
│   │   ├── routeSubscription.service.js # Route subscription mgmt      [WF1]
│   │   ├── search.service.js         # Smart search, occupancy mix      [WF2]
│   │   ├── bookingRequest.service.js # Booking create/respond/cancel    [WF2]
│   │   ├── rideExecution.service.js  # Start, location, pickup, etc.    [WF3]
│   │   ├── payment.service.js        # Payment settlement flow          [WF3]
│   │   └── rating.service.js         # Mutual ratings + trust score     [WF3]
│   ├── middlewares/
│   │   ├── auth.middleware.js        # JWT token verification
│   │   └── error.middleware.js       # 404 + global error handler
│   ├── lib/
│   │   ├── prisma.js                 # Prisma Client singleton
│   │   └── sseHub.js                 # SSE client manager
│   ├── utils/
│   │   ├── response.js               # Standardized JSON response helpers
│   │   ├── geo.js                    # Haversine distance calculations
│   │   └── routekey.js               # Route key normalization
│   ├── data/
│   │   ├── landmarks.js              # Pre-geocoded Karachi landmarks
│   │   └── landmarks.unresolved.json # Failed geocoding landmarks
│   └── scripts/
│       └── build-landmarks.js        # Utility to re-geocode landmarks
├── Backend_API_WF-2.md               # API Quick Reference for WF2
├── Backend_API_WF-3.md               # API Quick Reference for WF3
├── .env.example                      # Environment variable template
├── .gitignore
├── package.json
└── README.md                         # This file
```

### Architecture

```
Routes (HTTP) → Services (Business logic) → Prisma (Database)
```

- **Routes** – HTTP request/response handling
- **Services** – Business logic, validation, database operations
- **Middlewares** – Authentication, error handling
- **Utils** – Response formatting, geospatial math, key generation
- **Lib** – Prisma client, SSE hub

---

## Implemented Workflows (CRUD Flows)

### Workflow 1 — Driver Ride Publication (Supply Side)

#### Vehicle Management (Full CRUD)

| Operation | Method | Endpoint               | Description                     |
| --------- | ------ | ---------------------- | ------------------------------- |
| **Create** | POST   | `/api/vehicles`        | Register a new vehicle          |
| **Read**   | GET    | `/api/vehicles`        | List all driver's vehicles      |
| **Read**   | GET    | `/api/vehicles/:id`    | Get a specific vehicle          |
| **Update** | PUT    | `/api/vehicles/:id`    | Update vehicle details          |
| **Delete** | DELETE | `/api/vehicles/:id`    | Delete a vehicle                |

#### Ride Management (Full CRUD)

| Operation | Method | Endpoint               | Description                     |
| --------- | ------ | ---------------------- | ------------------------------- |
| **Create** | POST   | `/api/rides`           | Publish a new ride              |
| **Read**   | GET    | `/api/rides`           | List all driver's rides         |
| **Read**   | GET    | `/api/rides/:id`       | Get a specific ride             |
| **Update** | PUT    | `/api/rides/:id`       | Update ride details             |
| **Delete** | DELETE | `/api/rides/:id`       | Delete/cancel a ride            |

**Sub-Flows:** Route Intelligence Preview, Route Subscriptions (CRUD), Active Searches (Create/Ping/Deactivate), Notifications (Read/Mark/SSE Stream).

---

### Workflow 2 — Passenger Search & Booking (Demand Side)

#### Smart Search & Ride Preview

| Operation         | Method | Endpoint                            | Description                           |
| ----------------- | ------ | ----------------------------------- | ------------------------------------- |
| **Search Rides**  | GET    | `/api/search/rides`                 | Smart search with filters             |
| **Ride Preview**  | GET    | `/api/search/rides/:rideId/preview` | Detailed ride view with occupancy     |

#### Booking Request Management (Full CRUD)

| Operation  | Method | Endpoint                             | Description                          |
| ---------- | ------ | ------------------------------------ | ------------------------------------ |
| **Create** | POST   | `/api/booking-requests`              | Request a seat on a ride             |
| **Read**   | GET    | `/api/booking-requests`              | List passenger's bookings            |
| **Read**   | GET    | `/api/booking-requests/incoming`     | Driver lists incoming requests       |
| **Read**   | GET    | `/api/booking-requests/:id`          | Get a specific booking               |
| **Update** | PATCH  | `/api/booking-requests/:id/respond`  | Driver accepts or rejects            |
| **Update** | PATCH  | `/api/booking-requests/:id/cancel`   | Passenger cancels booking            |
| **Delete** | DELETE | `/api/booking-requests/:id`          | Delete a non-accepted booking        |

**Key Features:** Occupancy Mix (Safety), Instant vs. Scheduled Booking, Tiered Notifications, Gender Safety Enforcement, Cancellation Handling.

---

### Workflow 3 — Live Navigation & Trust Cycle

#### Ride Execution Lifecycle

| Step | Actor     | Endpoint                                          | Description                           |
| ---- | --------- | ------------------------------------------------- | ------------------------------------- |
| 1    | Driver    | `PATCH /rides/:rideId/start`                     | Start ride → IN_PROGRESS              |
| 2    | System    | —                                                 | Payment records auto-created          |
| 3    | Driver    | `GET /rides/:rideId/navigation`                  | Get Google Maps deep link             |
| 4    | Driver    | `PATCH /rides/:rideId/location`                  | Update live GPS location              |
| 5    | Passenger | `GET /rides/:rideId/track`                       | Track driver in real-time             |
| 6    | Driver    | `PATCH /bookings/:id/arrived-at-stop`            | Mark arrival at pickup stop           |
| 7    | Passenger | `PATCH /bookings/:id/verify-plate`               | Verify vehicle plate                  |
| 8    | Driver    | `PATCH /bookings/:id/pickup`                     | Confirm passenger boarded             |
| 9    | Driver    | `PATCH /bookings/:id/no-show`                    | Mark no-show (after 5 min wait)       |
| 10   | Driver    | `PATCH /bookings/:id/drop-off`                   | Mark passenger dropped off            |
| 11   | Driver    | `PATCH /rides/:rideId/complete`                  | Complete ride                         |

#### Payment Management

| Operation   | Method | Endpoint                              | Description                      |
| ----------- | ------ | ------------------------------------- | -------------------------------- |
| **Read**    | GET    | `/api/payments/rides/:rideId/due`     | Get payments due for a ride      |
| **Update**  | PATCH  | `/api/payments/:paymentId/mark-paid`  | Passenger records payment        |
| **Update**  | PATCH  | `/api/payments/:paymentId/confirm`    | Driver confirms payment received |

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

---

## API Documentation

All endpoints return consistent JSON:

```json
{ "success": true, "message": "...", "data": { ... } }
```

**Auth header:** `Authorization: Bearer <token>`

---

### 1. Authentication

#### `POST /api/auth/register` — Register (IBA email required)
#### `POST /api/auth/login` — Login, returns JWT + user profile
#### `GET /api/auth/me` — Get authenticated user's profile

See the root README or Backend_API_WF-2.md / Backend_API_WF-3.md for full request/response examples.

---

### 2–4. Vehicles, Rides, Route Intelligence — Workflow 1

Full CRUD for vehicles and rides with integrated route intelligence (geocoding, OSRM routing, landmark auto-tagging, fare calculation). See `Backend_API_WF-1.md` for complete details.

---

### 5–7. Route Subscriptions, Active Searches, Notifications — Workflow 1

Supporting sub-flows for the ride publication workflow. SSE stream at `GET /api/notifications/stream`.

---

### 8–9. Search & Booking Requests — Workflow 2

Smart search with landmark matching, live feed urgency, occupancy mix. Full CRUD booking requests with instant vs. scheduled flows. See `Backend_API_WF-2.md` for complete details.

---

### 10–11. Ride Execution — Workflow 3

Complete ride lifecycle management including start, navigation, location tracking, pickup verification, no-show handling, drop-off, and completion. See `Backend_API_WF-3.md` for complete details.

---

### 12. Payments — Workflow 3

Two-step payment settlement: passenger records method → driver confirms receipt. No-show passengers excluded. See `Backend_API_WF-3.md`.

---

### 13. Ratings (Full CRUD) — Workflow 3

Mutual rating system with trust score recalculation. Passenger rates driver on Punctuality + Safety; Driver rates passenger on Behavior. Full CRUD with ownership enforcement. See `Backend_API_WF-3.md`.

---

## Database Schema (ERD)

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
│ isDriver                │            │                 │
│ punctualityScore [WF3]  │            │ id (PK)         │
│ safetyScore [WF3]       │            │ driverId (FK)   │
│ behaviorScore [WF3]     │            │ vehicleId (FK)  │
│ totalRatingsReceived    │            │ status          │
│ [WF3]                   │            │ startedAt [WF3] │
└──────┬──────────────────┘            │ completedAt     │
       │                               │ currentLat [WF3]│
       │ 1:N                           │ currentLng [WF3]│
       │                               └──────┬──────────┘
       ▼                                      │ 1:N
┌──────────────────────┐               ┌──────┴──────────┐
│    RidePayment [WF3]  │               │  BookingRequest  │
│                      │               │                  │
│ id (PK)              │◀──────────────│ id (PK)          │
│ rideId (FK)          │   1:1         │ passengerId (FK) │
│ bookingRequestId (FK)│               │ rideId (FK)      │
│ passengerId (FK)     │               │ pickupStopId(FK) │
│ driverId (FK)        │               │ dropStopId (FK)  │
│ amount               │               │ participantStatus│
│ paymentMethod        │               │ plateVerified    │
│ status               │               │ [WF3]            │
│ paidAt               │               └──────────────────┘
│ confirmedByDriverAt  │
└──────────────────────┘               ┌──────────────────┐
                                       │    RideStop       │
┌──────────────────────┐               │ id (PK)          │
│   RideRating [WF3]    │               │ rideId (FK)      │
│ id (PK)              │               │ stopName         │
│ rideId (FK)          │               │ sequence         │
│ bookingRequestId (FK)│               │ lat, lng         │
│ raterId (FK)         │               └──────────────────┘
│ rateeId (FK)         │
│ ratingType           │  ┌──────────────────┐  ┌──────────────────┐
│ punctualityStars     │  │ RouteSubscription │  │ ActiveRouteSearch │
│ safetyStars          │  │ id, userId, key   │  │ id, userId, key   │
│ behaviorStars        │  └──────────────────┘  │ deactivatedAt[WF3]│
│ comment              │                         └──────────────────┘
└──────────────────────┘
                        ┌──────────────────┐
                        │  Notification     │
                        │ id, userId, rideId│
                        │ channel, status   │
                        │ title, message    │
                        └──────────────────┘
```

### Enums

| Enum Name               | Values                                         |
| ------------------------ | ---------------------------------------------- |
| `Gender`                 | `male`, `female`                               |
| `UserRole`               | `student`, `admin`                             |
| `RideType`               | `SCHEDULED`, `INSTANT`                         |
| `RideStatus`             | `PUBLISHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `GenderPreference`       | `ANY`, `FEMALES_ONLY`                          |
| `NotificationChannel`    | `EMAIL`, `IN_APP_TOAST`, `IN_APP`, `SSE`       |
| `NotificationStatus`     | `PENDING`, `SENT`, `FAILED`, `UNREAD`, `READ`  |
| `BookingRequestStatus`   | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` |
| `RideParticipantStatus`  | `BOOKED`, `PICKED_UP`, `NO_SHOW`, `DROPPED_OFF`|
| `PaymentStatus`          | `PENDING`, `PAID`, `WAIVED`                    |
| `PaymentMethod`          | `CASH`, `JAZZCASH`, `OTHER`                    |
| `RatingType`             | `PASSENGER_TO_DRIVER`, `DRIVER_TO_PASSENGER`   |

---

## Version Control Practices

- **Meaningful Commit Messages** – e.g., `feat: add ride CRUD`, `feat: add booking request CRUD`, `feat: add ride execution + payment + rating`
- **Feature Branches** – `feature/workflow-1`, `feature/workflow-2`, `feature/workflow-3`
- **Pull Requests** – Code review before merging to `main`
- **`.gitignore`** – Excludes `.env` and `node_modules/`
- **Final Code on `main`**

---

## Contributors

| Name   | Responsibility                                          |
| ------ | ------------------------------------------------------- |
| Khizer | Workflow 1 — Driver Ride Publication (Supply Side)      |
| Khizer | Workflow 3 — Live Navigation & Trust Cycle              |
| Aiman  | Workflow 2 — Passenger Search & Booking (Demand Side)   |

---

## License

This project is developed for academic purposes as part of the Web-Based Application Development course.
