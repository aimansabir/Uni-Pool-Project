# UniPool Backend — Complete API Documentation (Workflow 1 + Workflow 2)

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
10. [Workflow 2 — Feature Mapping](#workflow-2--feature-mapping)
11. [Database Schema (ERD)](#database-schema-erd)
12. [Version Control Practices](#version-control-practices)

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

| Migration                              | Description                              |
| -------------------------------------- | ---------------------------------------- |
| `init_user_auth`                       | Creates User table with auth fields      |
| `wf1_vehicle_ride_ridestop`            | Adds Vehicle, Ride, and RideStop tables  |
| `cascade_delete_ridestops`             | Enables cascade delete for RideStops     |
| `wf1_intelligence_notifications`       | Adds route intelligence & notification models |
| `add_gender_verified_to_user`          | Adds gender verification flag to User    |
| `add_ride_enums`                       | Adds ride status, type, and preference enums |
| `add_booking_request`                  | Adds BookingRequest model with passenger/stop relations, status enum, and ride/user foreign keys |

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
│   ├── schema.prisma              # Database schema (models, enums, relations)
│   └── migrations/                # Auto-generated migration SQL files
├── src/
│   ├── server.js                  # Entry point – loads env, starts HTTP server
│   ├── app.js                     # Express app – mounts middleware & routes
│   ├── routes/
│   │   ├── auth.routes.js         # POST /register, /login, GET /me
│   │   ├── vehicle.routes.js      # CRUD: POST, GET, GET/:id, PUT/:id, DELETE/:id
│   │   ├── ride.routes.js         # CRUD: POST, GET, GET/:id, PUT/:id, DELETE/:id + intelligence
│   │   ├── notification.routes.js # GET /, PATCH /:id/read, GET /stream (SSE)
│   │   ├── activeSearch.routes.js # POST /, PATCH /:id/ping, PATCH /:id/deactivate
│   │   ├── routeSubscription.routes.js # POST /, GET /, DELETE /:id
│   │   ├── search.routes.js       # GET /rides (search), GET /rides/:id/preview  [WF2]
│   │   └── bookingRequest.routes.js # POST, GET, GET/:id, PATCH/respond, PATCH/cancel, DELETE  [WF2]
│   ├── services/                  # Business logic layer (no HTTP awareness)
│   │   ├── auth.service.js        # Register, login, getMe
│   │   ├── vehicle.service.js     # Vehicle CRUD operations
│   │   ├── ride.service.js        # Ride CRUD + intelligence integration
│   │   ├── mapping.service.js     # Geocoding, routing, landmark detection, fare calc
│   │   ├── notification.service.js# Notification dispatch (email + SSE toast + IN-APP)
│   │   ├── activeSearch.service.js# Active route search management
│   │   ├── routeSubscription.service.js # Route subscription management
│   │   ├── search.service.js      # Smart search, occupancy mix, ride preview  [WF2]
│   │   └── bookingRequest.service.js # Booking create, respond, cancel, delete  [WF2]
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT token verification
│   │   └── error.middleware.js    # 404 handler + global error handler
│   ├── lib/
│   │   ├── prisma.js              # Prisma Client singleton
│   │   └── sseHub.js              # Server-Sent Events (SSE) client manager
│   ├── utils/
│   │   ├── response.js            # Standardized JSON response helpers
│   │   ├── geo.js                 # Haversine distance calculations
│   │   └── routekey.js            # Route key normalization for matching
│   ├── data/
│   │   ├── landmarks.js           # Pre-geocoded Karachi landmark coordinates
│   │   └── landmarks.unresolved.json # Landmarks that failed geocoding
│   └── scripts/
│       └── build-landmarks.js     # Utility to re-geocode landmark data
├── Backend_API_WF-2.md            # API Quick Reference for Workflow 2
├── .env.example                   # Template for environment variables
├── .gitignore                     # Ignores node_modules/ and .env
├── package.json                   # Dependencies and npm scripts
└── README.md                      # This file
```

### Architecture Overview

The backend follows a **modular, layered architecture**:

```
Routes (HTTP layer) → Services (Business logic) → Prisma (Database layer)
```

- **Routes** – Handle HTTP requests/responses, input parsing, and call the appropriate service.
- **Services** – Contain all business logic, validation, and database operations via Prisma.
- **Middlewares** – Cross-cutting concerns (authentication, error handling).
- **Utils** – Shared helper functions (response formatting, geospatial math, key generation).
- **Lib** – Singleton instances (Prisma client, SSE hub).

---

## Implemented Workflows (CRUD Flows)

> **Note:** As per the Milestone 3 rubric, login/register flows do not count toward the two required distinct workflows.

### Workflow 1 — Driver Ride Publication (Supply Side)

This is the full **Driver Ride Publication** flow from the project design, implementing CRUD for two core entities:

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

**Additional Workflow Sub-Flows:**

- **Route Intelligence Preview** (`POST /api/rides/intelligence/preview`) – Geocodes start/end, generates route via OSRM, detects landmarks, calculates fare.
- **Route Subscriptions** (Create/Read/Delete) – Passengers subscribe to routes for both Email and standard in-app notifications.
- **Active Route Searches** (Create/Ping/Deactivate) – Tracks active passengers for instant ride toast alerts.
- **Notifications** (Read/Mark Read/SSE Stream) – Delivers scheduled email notifications and in-app notifications and instant toast pop-ups via Server-Sent Events.

### Workflow 2 — Passenger Search & Booking (Demand Side)

Workflow 2 covers the **demand side** of UniPool — how a passenger finds a ride, books a seat, and handles cancellations. It implements two new modules:

#### Smart Search & Ride Preview (Read Operations)

| Operation         | Method | Endpoint                            | Description                                          |
| ----------------- | ------ | ----------------------------------- | ---------------------------------------------------- |
| **Search Rides**  | GET    | `/api/search/rides`                 | Smart search with pickup, dropoff, slot & urgency filters |
| **Ride Preview**  | GET    | `/api/search/rides/:rideId/preview` | Detailed ride view with route, stops, and occupancy   |

#### Booking Request Management (Full CRUD)

| Operation  | Method | Endpoint                             | Description                          |
| ---------- | ------ | ------------------------------------ | ------------------------------------ |
| **Create** | POST   | `/api/booking-requests`              | Request a seat on a ride             |
| **Read**   | GET    | `/api/booking-requests`              | List passenger's booking requests    |
| **Read**   | GET    | `/api/booking-requests/incoming`     | Driver lists incoming booking requests |
| **Read**   | GET    | `/api/booking-requests/:id`          | Get a specific booking request       |
| **Update** | PATCH  | `/api/booking-requests/:id/respond`  | Driver accepts or rejects a request  |
| **Update** | PATCH  | `/api/booking-requests/:id/cancel`   | Passenger cancels their booking      |
| **Delete** | DELETE | `/api/booking-requests/:id`          | Passenger deletes a non-accepted booking |

**Key Sub-Flows:**

- **Occupancy Mix (Safety)** – Every search result and ride preview includes the live gender composition of the car (e.g., "Occupants: 1 Male, 2 Female") computed from accepted bookings.
- **Instant vs. Scheduled Booking** – The booking system handles both ride types with distinct labels ("Join Ride Instantly" vs. "Request Seat") and notification priorities.
- **Tiered Notification System** – Driver and passenger notifications use priority levels (`HIGH`/`NORMAL`) and presentation styles (`LIVE_TOAST`/`STANDARD_PUSH`) to differentiate instant and scheduled ride alerts.
- **Passenger Navigation Hints** – After driver responds, the API returns navigation hints (`TRACK_RIDE`, `BOOKING_CONFIRMED`, `REQUEST_REJECTED`) for frontend routing.
- **Gender Safety Enforcement** – Males are blocked from `FEMALES_ONLY` rides (403), and driver gender configuration is validated.
- **Driver Ride Cancellation** – When a driver deletes/cancels a ride that has accepted bookings, all affected passengers are automatically notified. This cancellation logic is implemented in Workflow 1's ride deletion flow (`DELETE /api/rides/:id`) and fulfils the cancellation handling requirement described in Workflow 2's design.

---

## API Documentation

All endpoints return consistent JSON responses:

**Success Response:**
```json
{
  "success": true,
  "message": "Descriptive message.",
  "data": { "..." }
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
      "trustScore": 5.0,
      "isVerified": false,
      "genderVerified": false,
      "vehicles": []
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
    "trustScore": 5.0
  }
}
```

---

### 2. Vehicles (CRUD) — Workflow 1

> All vehicle endpoints require authentication.

#### `POST /api/vehicles`

Add a new vehicle.

**Request Body:**
```json
{
  "make": "Toyota",
  "model": "Corolla",
  "color": "White",
  "registrationNumber": "ABC-1234",
  "imageUrl": "https://example.com/car.jpg"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Vehicle added.",
  "data": {
    "id": "uuid",
    "driverId": "uuid",
    "make": "Toyota",
    "model": "Corolla",
    "color": "White",
    "registrationNumber": "ABC-1234",
    "imageUrl": "https://example.com/car.jpg",
    "createdAt": "2026-04-01T12:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z"
  }
}
```

---

#### `GET /api/vehicles`

List all vehicles belonging to the authenticated driver.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "make": "Toyota",
      "model": "Corolla",
      "color": "White",
      "registrationNumber": "ABC-1234",
      "imageUrl": null,
      "createdAt": "2026-04-01T12:00:00.000Z",
      "updatedAt": "2026-04-01T12:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/vehicles/:id`

Get details of a specific vehicle (must belong to authenticated user).

---

#### `PUT /api/vehicles/:id`

Update a vehicle's details. Only `make`, `model`, `color`, and `imageUrl` can be updated.

**Request Body (partial update allowed):**
```json
{
  "color": "Silver",
  "model": "Civic"
}
```

---

#### `DELETE /api/vehicles/:id`

Delete a vehicle. Cannot delete if it is attached to any existing rides.

**Error (400) – Vehicle has linked rides:**
```json
{
  "success": false,
  "message": "Cannot delete a vehicle that is attached to existing rides. Delete the ride(s) first."
}
```

---

### 3. Rides (CRUD) — Workflow 1

> All ride endpoints require authentication.

#### `POST /api/rides`

Publish a new ride. Integrates Route Intelligence for auto-tagging landmarks, computing fare, and setting ride metadata.

**Request Body:**
```json
{
  "vehicleId": "uuid",
  "startLocation": "Maskan Gate",
  "destinationLocation": "IBA City Campus",
  "departureTime": "2026-04-05T07:45:00.000Z",
  "targetSlot": "08:30 AM Class",
  "rideType": "SCHEDULED",
  "seatsTotal": 3,
  "farePerSeat": 200,
  "genderPreference": "ANY",
  "confirmedStops": [
    {
      "stopName": "Nipa Chowrangi",
      "sequence": 1,
      "lat": 24.9178,
      "lng": 67.0971
    }
  ]
}
```

**Key Validations:**
- `vehicleId`, `startLocation`, `destinationLocation`, `rideType`, `seatsTotal` are required
- Driver must be verified (`isVerified: true`)
- `rideType` must be `SCHEDULED` or `INSTANT`
- `INSTANT` rides auto-set departure to current time + 10 minutes and are marked as urgent
- `SCHEDULED` rides require a future `departureTime`
- `farePerSeat` cannot exceed the computed fare cap
- `FEMALES_ONLY` gender preference requires a gender-verified female driver
- `confirmedStops` array is required (can be empty `[]`)

---

#### `GET /api/rides`

List all rides published by the authenticated driver.

---

#### `GET /api/rides/:id`

Get details of a specific ride (must belong to authenticated driver).

---

#### `PUT /api/rides/:id`

Update an existing ride. Route intelligence is automatically refreshed if route-related fields change.

---

#### `DELETE /api/rides/:id`

Delete a ride. If the ride has accepted bookings, all affected passengers are notified (via in-app toast and SSE for instant rides).

---

### 4. Route Intelligence

#### `POST /api/rides/intelligence/preview`

Preview route intelligence without publishing a ride. Returns geocoded locations, route geometry, detected landmarks, and fare suggestion.

**Request Body:**
```json
{
  "startLocation": "Maskan Gate",
  "destinationLocation": "Clifton",
  "seatsTotal": 3,
  "rideType": "SCHEDULED",
  "departureTime": "2026-04-05T07:45:00.000Z"
}
```

---

### 5. Route Subscriptions

> Passengers subscribe to both Email and standard in-app notifications for scheduled rides on specific routes.

#### `POST /api/route-subscriptions`

Create or update a route subscription.

**Request Body:**
```json
{
  "startLocation": "Maskan Gate",
  "destinationLocation": "IBA City Campus",
  "channel": "EMAIL"
}
```

---

#### `GET /api/route-subscriptions`

List all route subscriptions for the authenticated user.

---

#### `DELETE /api/route-subscriptions/:id`

Delete a route subscription.

---

### 6. Active Route Searches

> Tracks which passengers are currently searching for rides on a route (used for instant ride toast alerts via SSE).

#### `POST /api/active-searches`

Register or re-activate an active route search.

---

#### `PATCH /api/active-searches/:id/ping`

Send a heartbeat to keep the search active.

---

#### `PATCH /api/active-searches/:id/deactivate`

Deactivate a route search.

---

### 7. Notifications

#### `GET /api/notifications`

List all notifications for the authenticated user (newest first).

---

#### `PATCH /api/notifications/:id/read`

Mark a notification as read.

---

#### `GET /api/notifications/stream`

Opens a **Server-Sent Events (SSE)** connection for real-time notifications (instant ride toast alerts).

**Headers:** `Authorization: Bearer <token>`

**Response:** `text/event-stream`

```
event: connected
data: {"ok":true}

event: ride-toast
data: {"id":"uuid","title":"Instant ride available now","message":"Clifton → IBA leaving shortly","rideId":"uuid","farePerSeat":150}
```

---

### 8. Search (Smart Search & Live Feed)

#### `GET /api/search/rides`

Search for available rides using smart filters. Implements **Landmark Matching** (matches pickup/dropoff against start location, route key, and individual stop names) and the **Live Feed** (urgent "Leaving Now" rides are sorted to the top of results).

**Query Parameters:**

| Parameter    | Type    | Required | Description                                                                    |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------ |
| `pickup`     | string  | ❌       | Pickup location keyword (matches start location, route key, or stop names)     |
| `dropoff`    | string  | ❌       | Drop-off keyword (matches destination, destination key, or stop names)         |
| `targetSlot` | string  | ❌       | Target class time slot (e.g., "08:30 AM")                                      |
| `rideType`   | string  | ❌       | Filter by ride type: `SCHEDULED` or `INSTANT`                                  |
| `onlyUrgent` | boolean | ❌       | If `true`, show only urgent "Leaving Now" rides                                |

**Example Request:**
```
GET /api/search/rides?pickup=Clifton&dropoff=IBA&targetSlot=08:30 AM
```

**Sort Order:**
1. Urgent rides first (`isUrgent: desc`)
2. Earliest departure time (`departureTime: asc`)
3. Newest first (`createdAt: desc`)

**Key Features in Response:**
- `bookingActionLabel` – Returns `"Join Ride Instantly"` for `INSTANT` rides and `"Request Seat"` for `SCHEDULED` rides.
- `isUrgent` – Boolean flag for frontend to highlight urgent rides.
- `occupancyMix` – Live gender composition of the car for passenger safety decisions.

---

#### `GET /api/search/rides/:rideId/preview`

Get a detailed preview of a specific ride. Returns full route data, all stops with coordinates, accepted passenger details, and occupancy information.

**Key Features in Response:**
- `routeGeometry` – GeoJSON LineString for rendering the driver's route on a map.
- `stops` – All ordered stops with lat/lng coordinates for map markers.
- `acceptedPassengers` – List of confirmed passengers with their pickup/drop stops.
- `occupancyMix` – Live gender composition of current occupants.
- `driver.phone` – Exposed in preview for contact after booking.

---

### 9. Booking Requests (CRUD)

#### `POST /api/booking-requests`

Create a new booking request. Handles both **Scheduled** ("Request Seat") and **Instant** ("Join Ride Instantly") flows.

**Request Body:**
```json
{
  "rideId": "uuid",
  "pickupStopId": "uuid",
  "dropStopId": "uuid",
  "requestedSeats": 1,
  "note": "I'll be at the main gate"
}
```

**Fields:**

| Field            | Type   | Required | Description                                       |
| ---------------- | ------ | -------- | ------------------------------------------------- |
| `rideId`         | string | ✅       | ID of the ride to book                            |
| `pickupStopId`   | string | ✅       | ID of the preferred pickup stop (from ride stops) |
| `dropStopId`     | string | ❌       | ID of the preferred drop-off stop                 |
| `requestedSeats` | number | ❌       | Must be `1` (only one seat per booking allowed)   |
| `note`           | string | ❌       | Optional message for the driver                   |

**Validations:**
- Ride must exist and be in `PUBLISHED` status
- Driver cannot book their own ride (400)
- `pickupStopId` is required (400)
- `requestedSeats` must be exactly `1` (400)
- Pickup and drop stops must follow route order (400)
- Ride must have enough available seats (400)
- Passenger must not have an existing `PENDING` or `ACCEPTED` booking on the same ride (409)
- `FEMALES_ONLY` rides block male passengers (403)

**Notification Behavior:**

| Ride Type   | Label                 | Notification Type          | Priority | Presentation    |
| ----------- | --------------------- | -------------------------- | -------- | --------------- |
| `SCHEDULED` | "Request Seat"        | `STANDARD_BOOKING_REQUEST` | `NORMAL` | `STANDARD_PUSH` |
| `INSTANT`   | "Join Ride Instantly" | `INSTANT_BOOKING_ALERT`    | `HIGH`   | `LIVE_TOAST`    |

---

#### `GET /api/booking-requests`

List all booking requests belonging to the authenticated passenger.

---

#### `GET /api/booking-requests/incoming`

List all **PENDING** booking requests for rides owned by the authenticated driver.

---

#### `GET /api/booking-requests/:id`

Get details of a specific booking request. Accessible by either the passenger or the ride driver.

---

#### `PATCH /api/booking-requests/:id/respond`

Driver accepts or rejects a booking request. On acceptance, the seat count is atomically decremented.

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Passenger Navigation Behavior:**

| Ride Type   | Response   | `passengerNavigation` | Frontend Action                |
| ----------- | ---------- | --------------------- | ------------------------------ |
| `SCHEDULED` | `ACCEPTED` | `BOOKING_CONFIRMED`   | Show confirmation screen       |
| `INSTANT`   | `ACCEPTED` | `TRACK_RIDE`          | Redirect to live ride tracking |
| Any         | `REJECTED` | `REQUEST_REJECTED`    | Show rejection notice          |

---

#### `PATCH /api/booking-requests/:id/cancel`

Passenger cancels their booking. If accepted, the seat is immediately freed up.

**Cancellation Logic:**

| Previous Status | Seat Restored?              | Driver Notification Priority           |
| --------------- | --------------------------- | -------------------------------------- |
| `PENDING`       | No                          | `NORMAL` / `STANDARD_PUSH`            |
| `ACCEPTED`      | ✅ Yes (incremented back)   | Depends on ride type (HIGH for instant)|

---

#### `DELETE /api/booking-requests/:id`

Permanently delete a booking request record. `ACCEPTED` bookings must be cancelled first.

---

## Workflow 2 — Feature Mapping

This section maps each requirement from the Workflow 2 design document to its implementation in the codebase.

### 1. Smart Search & Live Feed ✅

| Design Requirement | Implementation | Location |
| ------------------ | -------------- | -------- |
| Passenger enters pickup, drop-off, Target Class Slot | `pickup`, `dropoff`, `targetSlot` query params | `search.routes.js` → `GET /rides` |
| Landmark Matching — search drivers whose route passes through a location | Prisma `OR` filter checks `startLocation`, `routeKey`, AND `stops.stopName` (case-insensitive) | `search.service.js` → `searchRides()` |
| Live Feed — urgent "Leaving Now" rides highlighted at top | Results sorted `isUrgent: 'desc'` first; `onlyUrgent` filter available; `isUrgent` flag in response for frontend color styling | `search.service.js` → `searchRides()` |

### 2. Result Visualization (Safety & Fare) ✅

| Design Requirement | Implementation | Location |
| ------------------ | -------------- | -------- |
| Occupancy Mix — display "Occupants: 1 Male, 2 Females" | `buildOccupancyMix()` counts driver gender + all accepted passengers' genders | `search.service.js` → `buildOccupancyMix()` |
| Fare View — fixed price per seat | `farePerSeat`, `suggestedFarePerSeat`, `fareCap` in ride card | `search.service.js` → `mapRideCard()` |
| Route Preview — map view with driver's path and stops | `routeGeometry` (GeoJSON), `stops[]` (with lat/lng), `distanceKm`, `durationMin` | `search.service.js` → `getRidePreview()` |

### 3. Booking Request (Instant vs. Standard) ✅

| Design Requirement | Implementation | Location |
| ------------------ | -------------- | -------- |
| Scheduled: Select landmark, click "Request Seat" | `pickupStopId`/`dropStopId` accepted, validated against ride stops; label `"Request Seat"` | `bookingRequest.service.js` → `createBookingRequest()` |
| Instant: Click "Join Ride Instantly" | Same endpoint; label `"Join Ride Instantly"` for instant rides | `bookingRequest.service.js` → `createBookingRequest()` |
| Driver notification — distinct alert for instant rides | Notification created in transaction with `priority: HIGH` + `presentation: LIVE_TOAST` for instant | `bookingRequest.service.js` → `createBookingRequest()` |

### 4. Confirmation & State Update ✅

| Design Requirement | Implementation | Location |
| ------------------ | -------------- | -------- |
| Driver accepts the request | `respondToBookingRequest()` with `status: ACCEPTED` | `bookingRequest.service.js` → `respondToBookingRequest()` |
| Seat count decreases | Atomic `seatsAvailable` decrement in `$transaction` | `bookingRequest.service.js` → `respondToBookingRequest()` |
| Occupancy Mix updated for future searchers | `buildOccupancyMix()` computed live from current accepted bookings on every search query | `search.service.js` → `buildOccupancyMix()` |
| Standard → Passenger receives confirmation | Notification with `passengerNavigation: 'BOOKING_CONFIRMED'` | `bookingRequest.service.js` → `respondToBookingRequest()` |
| Instant → "Track Ride" link immediately | Notification with `passengerNavigation: 'TRACK_RIDE'` | `bookingRequest.service.js` → `respondToBookingRequest()` |

### 5. Cancellation Handling (Real-Time Logic) ✅

| Design Requirement | Implementation | Location |
| ------------------ | -------------- | -------- |
| Passenger cancels → seat freed + driver notified | `cancelBookingRequest()` sets `CANCELLED`, increments `seatsAvailable` (if accepted), creates driver notification | `bookingRequest.service.js` → `cancelBookingRequest()` |
| Driver cancels scheduled ride → all passengers alerted | Implemented in Workflow 1's ride deletion flow (`DELETE /api/rides/:id`) | `ride.service.js` (Workflow 1) |
| Driver cancels instant ride → critical alert to passenger | Same as above — handles instant rides with appropriate alert priority | `ride.service.js` (Workflow 1) |

---

## Database Schema (ERD)

The following models are defined in `prisma/schema.prisma`:

```
┌────────────────┐     1:N     ┌────────────────┐
│      User      │────────────▶│    Vehicle      │
│                │             │                │
│ id (PK)        │     1:N     │ id (PK)        │
│ fullName       │────────┐   │ driverId (FK)  │
│ ibaEmail (UQ)  │        │   │ make           │
│ password       │        │   │ model          │
│ phone          │        │   │ color          │
│ studentErp (UQ)│        │   │ registrationNo │
│ gender         │        │   │ imageUrl       │
│ role           │        │   └─────┬──────────┘
│ trustScore     │        │         │ 1:N
│ isVerified     │        │         ▼
│ genderVerified │        │   ┌─────────────────┐
└──────┬─────────┘        └──▶│      Ride        │
       │                       │                 │
       │ 1:N                   │ id (PK)         │
       │                       │ driverId (FK)   │
       ▼                       │ vehicleId (FK)  │
┌──────────────────┐           │ startLocation   │
│ RouteSubscription│           │ destinationLoc  │
│                  │           │ rideType        │
│ id (PK)          │           │ status          │
│ userId (FK)      │           │ farePerSeat     │
│ routeKey         │           │ seatsTotal      │
│ destinationKey   │           │ routeGeometry   │
│ channel          │           │ distanceKm      │
│ isActive         │           └──────┬──────────┘
└──────────────────┘                  │ 1:N
                                      ▼
┌──────────────────┐           ┌──────────────────┐
│ ActiveRouteSearch│           │    RideStop       │
│                  │           │                  │
│ id (PK)          │           │ id (PK)          │
│ userId (FK)      │           │ rideId (FK)      │
│ routeKey         │           │ stopName         │
│ destinationKey   │           │ sequence         │
│ isActive         │           │ lat, lng         │
│ lastSeenAt       │           │ isSuggested      │
└──────────────────┘           │ isConfirmed      │
                               │ pickupBookings[] │──▶ BookingRequest
                               │ dropBookings[]   │──▶ BookingRequest
                               └──────────────────┘
┌──────────────────┐
│  Notification     │
│                  │
│ id (PK)          │
│ userId (FK)      │
│ rideId (FK)      │
│ channel          │
│ status           │
│ title            │
│ message          │
│ payload (JSON)   │
└──────────────────┘

┌──────────────────────────────┐
│       BookingRequest          │
│                              │
│ id (PK)                      │
│ passengerId (FK) ──▶ User     │
│ rideId (FK)      ──▶ Ride     │
│ pickupStopId (FK)──▶ RideStop │
│ dropStopId (FK)  ──▶ RideStop │
│ requestedSeats   (default: 1) │
│ note                          │
│ status           (enum)       │
│ requestedAt                   │
│ respondedAt                   │
│ cancelledAt                   │
│                              │
│ @@index([passengerId, status]) │
│ @@index([rideId, status])      │
└──────────────────────────────┘
```

### Enums

| Enum Name              | Values                                         |
| ---------------------- | ---------------------------------------------- |
| `Gender`               | `male`, `female`                               |
| `UserRole`             | `student`, `admin`                             |
| `RideType`             | `SCHEDULED`, `INSTANT`                         |
| `RideStatus`           | `PUBLISHED`, `CANCELLED`, `COMPLETED`          |
| `GenderPreference`     | `ANY`, `FEMALES_ONLY`                          |
| `NotificationChannel`  | `EMAIL`, `IN_APP_TOAST`, `IN_APP`              |
| `NotificationStatus`   | `PENDING`, `SENT`, `FAILED`, `READ`            |
| `BookingRequestStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` |

---

## Version Control Practices

This project follows best practices for version control:

- **Meaningful Commit Messages** – Each commit describes the specific change made (e.g., `feat: add ride CRUD endpoints`, `feat: add booking request CRUD`).
- **Feature Branches** – Development is done on feature branches (e.g., `feature/workflow-1`, `feature/workflow-2`) and merged into `main` via pull requests.
- **Pull Requests** – Code changes are reviewed through pull requests before merging to the main branch.
- **`.gitignore`** – Sensitive files (`.env`) and dependencies (`node_modules/`) are excluded from version control.
- **Final Code on `main`** – The final version of milestone code is always merged into the `main` branch.

---

## Contributors

| Name   | Responsibility                                          |
| ------ | ------------------------------------------------------- |
| Khizer | Workflow 1 — Driver Ride Publication (Supply Side)      |
| Aiman  | Workflow 2 — Passenger Search & Booking (Demand Side)   |

---

## License

This project is developed for academic purposes as part of the Web-Based Application Development course.
