# UniPool Backend — Workflow 2: Passenger Search & Booking (Demand Side)

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
8. [Workflow 2 — Overview](#workflow-2--overview)
9. [API Documentation](#api-documentation)
   - [Search (Smart Search & Live Feed)](#1-search-smart-search--live-feed)
   - [Booking Requests (CRUD)](#2-booking-requests-crud)
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

| Variable       | Required | Default | Description                      |
| -------------- | -------- | ------- | -------------------------------- |
| `DATABASE_URL` | ✅       | —       | PostgreSQL connection string     |
| `JWT_SECRET`   | ✅       | —       | Secret key for signing JWT tokens|
| `PORT`         | ❌       | `3000`  | Port the server listens on       |

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

Prisma manages the database schema through migrations. The migration relevant to Workflow 2:

| Migration              | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `add_booking_request`  | Adds BookingRequest model with passenger/stop relations, status enum, and ride/user foreign keys |

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

Files created/modified for Workflow 2 are marked with `[WF2]`:

```
unipool-backend/
├── prisma/
│   ├── schema.prisma              # Database schema – BookingRequest model added [WF2]
│   └── migrations/                # Auto-generated migration SQL files
├── src/
│   ├── server.js                  # Entry point – loads env, starts HTTP server
│   ├── app.js                     # Express app – mounts search & booking routes [WF2]
│   ├── routes/
│   │   ├── auth.routes.js         # POST /register, /login, GET /me
│   │   ├── search.routes.js       # GET /rides (search), GET /rides/:id/preview  [WF2]
│   │   └── bookingRequest.routes.js # POST, GET, GET/:id, PATCH/respond, PATCH/cancel, DELETE  [WF2]
│   ├── services/
│   │   ├── auth.service.js        # Register, login, getMe
│   │   ├── search.service.js      # Smart search, occupancy mix, ride preview  [WF2]
│   │   └── bookingRequest.service.js # Booking create, respond, cancel, delete  [WF2]
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT token verification
│   │   └── error.middleware.js    # 404 handler + global error handler
│   ├── lib/
│   │   ├── prisma.js              # Prisma Client singleton
│   │   └── sseHub.js              # SSE connection manager for real-time push [WF2]
│   └── utils/
│       └── response.js            # Standardized JSON response helpers
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

---

## Workflow 2 — Overview

> **Note:** As per the Milestone 3 rubric, login/register flows do not count toward the two required distinct workflows.

Workflow 2 covers the **demand side** of UniPool — how a passenger finds a ride, books a seat, and handles cancellations. It implements two new modules:

### Smart Search & Ride Preview (Read Operations)

| Operation         | Method | Endpoint                            | Description                                          |
| ----------------- | ------ | ----------------------------------- | ---------------------------------------------------- |
| **Search Rides**  | GET    | `/api/search/rides`                 | Smart search with pickup, dropoff, slot & urgency filters |
| **Ride Preview**  | GET    | `/api/search/rides/:rideId/preview` | Detailed ride view with route, stops, and occupancy   |

### Booking Request Management (Full CRUD)

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

**Authentication:** All endpoints require a JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 1. Search (Smart Search & Live Feed)

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride search results fetched successfully.",
  "data": [
    {
      "id": "uuid",
      "rideType": "INSTANT",
      "bookingActionLabel": "Join Ride Instantly",
      "status": "PUBLISHED",
      "isUrgent": true,
      "startLocation": "Clifton Block 5",
      "destinationLocation": "IBA City Campus",
      "departureTime": "2026-04-05T07:45:00.000Z",
      "targetSlot": "08:30 AM Class",
      "seatsTotal": 3,
      "seatsAvailable": 2,
      "farePerSeat": 200,
      "genderPreference": "ANY",
      "routeKey": "clifton-block-5__iba-city-campus",
      "destinationKey": "iba-city-campus",
      "distanceKm": 12.5,
      "durationMin": 28,
      "suggestedFarePerSeat": 180,
      "fareCap": 230,
      "driver": {
        "id": "uuid",
        "fullName": "Ali Ahmed",
        "gender": "male",
        "trustScore": 5.0
      },
      "vehicle": {
        "id": "uuid",
        "make": "Toyota",
        "model": "Corolla",
        "color": "White",
        "registrationNumber": "ABC-1234"
      },
      "occupancyMix": {
        "male": 1,
        "female": 1,
        "text": "Occupants: 1 Male, 1 Female"
      }
    },
    {
      "id": "uuid",
      "rideType": "SCHEDULED",
      "bookingActionLabel": "Request Seat",
      "status": "PUBLISHED",
      "isUrgent": false,
      "startLocation": "Maskan Gate",
      "destinationLocation": "IBA City Campus",
      "departureTime": "2026-04-05T08:00:00.000Z",
      "farePerSeat": 150,
      "occupancyMix": {
        "male": 1,
        "female": 0,
        "text": "Occupants: 1 Male, 0 Female"
      },
      "...": "..."
    }
  ]
}
```

**Key Features in Response:**
- `bookingActionLabel` – Returns `"Join Ride Instantly"` for `INSTANT` rides and `"Request Seat"` for `SCHEDULED` rides, ready for frontend button text.
- `isUrgent` – Boolean flag for frontend to highlight urgent rides with a distinct color (e.g., Red/Orange).
- `occupancyMix` – Live gender composition of the car for passenger safety decisions.

---

#### `GET /api/search/rides/:rideId/preview`

Get a detailed preview of a specific ride. Returns full route data, all stops with coordinates, accepted passenger details, and occupancy information — everything the frontend needs to render a map view with the driver's path.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride preview fetched successfully.",
  "data": {
    "id": "uuid",
    "rideType": "SCHEDULED",
    "bookingActionLabel": "Request Seat",
    "status": "PUBLISHED",
    "isUrgent": false,
    "startLocation": "Maskan Gate",
    "destinationLocation": "IBA City Campus",
    "departureTime": "2026-04-05T07:45:00.000Z",
    "targetSlot": "08:30 AM Class",
    "seatsTotal": 3,
    "seatsAvailable": 2,
    "farePerSeat": 200,
    "genderPreference": "ANY",
    "routeKey": "maskan-gate__iba-city-campus",
    "destinationKey": "iba-city-campus",
    "routeGeometry": {
      "type": "LineString",
      "coordinates": [[67.09, 24.92], [67.05, 24.87], "..."]
    },
    "distanceKm": 12.5,
    "durationMin": 28,
    "suggestedFarePerSeat": 180,
    "fareCap": 230,
    "mappingProvider": "Nominatim + OSRM",
    "driver": {
      "id": "uuid",
      "fullName": "Ali Ahmed",
      "gender": "male",
      "trustScore": 5.0,
      "phone": "03001234567"
    },
    "vehicle": {
      "id": "uuid",
      "make": "Toyota",
      "model": "Corolla",
      "color": "White",
      "registrationNumber": "ABC-1234",
      "imageUrl": null
    },
    "stops": [
      {
        "id": "uuid",
        "stopName": "Nipa Chowrangi",
        "sequence": 1,
        "lat": 24.9178,
        "lng": 67.0971,
        "isSuggested": false,
        "isConfirmed": true
      },
      {
        "id": "uuid",
        "stopName": "Shahrah-e-Faisal",
        "sequence": 2,
        "lat": 24.8607,
        "lng": 67.0645,
        "isSuggested": true,
        "isConfirmed": true
      }
    ],
    "occupancyMix": {
      "male": 1,
      "female": 1,
      "text": "Occupants: 1 Male, 1 Female"
    },
    "acceptedPassengers": [
      {
        "id": "booking-uuid",
        "requestedSeats": 1,
        "passenger": {
          "id": "uuid",
          "fullName": "Sara Khan",
          "gender": "female"
        },
        "pickupStop": {
          "id": "uuid",
          "stopName": "Nipa Chowrangi",
          "sequence": 1
        },
        "dropStop": null
      }
    ]
  }
}
```

**Key Features in Response:**
- `routeGeometry` – GeoJSON LineString for rendering the driver's route on a map.
- `stops` – All ordered stops with lat/lng coordinates for map markers.
- `acceptedPassengers` – List of confirmed passengers with their pickup/drop stops.
- `occupancyMix` – Live gender composition of current occupants.
- `driver.phone` – Exposed in preview for contact after booking.

---

### 2. Booking Requests (CRUD)

#### `POST /api/booking-requests`

Create a new booking request. Handles both **Scheduled** ("Request Seat") and **Instant** ("Join Ride Instantly") flows. The driver receives an appropriate notification — instant rides trigger a high-priority live toast alert for immediate attention.

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
- `requestedSeats` must be exactly `1` — only one seat per booking request is allowed (400)
- Pickup and drop stops must follow route order — pickup sequence must be less than drop sequence (400)
- Ride must have enough available seats (400)
- Passenger must not have an existing `PENDING` or `ACCEPTED` booking on the same ride (409)
- Pickup/drop stops must belong to the ride and be confirmed (400)
- `FEMALES_ONLY` rides block male passengers (403)
- `FEMALES_ONLY` rides validate that the driver is female (400)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking request created successfully.",
  "data": {
    "id": "booking-uuid",
    "passengerId": "uuid",
    "rideId": "uuid",
    "pickupStopId": "uuid",
    "dropStopId": "uuid",
    "requestedSeats": 1,
    "note": "I'll be at the main gate",
    "status": "PENDING",
    "requestedAt": "2026-04-05T07:30:00.000Z",
    "respondedAt": null,
    "cancelledAt": null,
    "passenger": {
      "id": "uuid",
      "fullName": "Aiman Sabir",
      "gender": "female"
    },
    "ride": {
      "id": "uuid",
      "driverId": "uuid",
      "rideType": "SCHEDULED",
      "startLocation": "Maskan Gate",
      "destinationLocation": "IBA City Campus",
      "departureTime": "2026-04-05T07:45:00.000Z",
      "seatsAvailable": 2,
      "farePerSeat": 200,
      "isUrgent": false
    },
    "pickupStop": {
      "id": "uuid",
      "stopName": "Nipa Chowrangi",
      "sequence": 1
    },
    "dropStop": null,
    "requestActionLabel": "Request Seat",
    "driverNotificationType": "STANDARD_BOOKING_REQUEST",
    "driverNotificationId": "notif-uuid"
  }
}
```

**Notification Behavior:**

| Ride Type   | Label                 | Notification Type          | Priority | Presentation    |
| ----------- | --------------------- | -------------------------- | -------- | --------------- |
| `SCHEDULED` | "Request Seat"        | `STANDARD_BOOKING_REQUEST` | `NORMAL` | `STANDARD_PUSH` |
| `INSTANT`   | "Join Ride Instantly" | `INSTANT_BOOKING_ALERT`    | `HIGH`   | `LIVE_TOAST`    |

---

#### `GET /api/booking-requests`

List all booking requests belonging to the authenticated passenger, including full ride and vehicle details.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking requests fetched successfully.",
  "data": [
    {
      "id": "booking-uuid",
      "status": "ACCEPTED",
      "requestedSeats": 1,
      "note": "I'll be at the main gate",
      "requestedAt": "2026-04-05T07:30:00.000Z",
      "respondedAt": "2026-04-05T07:32:00.000Z",
      "cancelledAt": null,
      "ride": {
        "id": "uuid",
        "startLocation": "Maskan Gate",
        "destinationLocation": "IBA City Campus",
        "departureTime": "2026-04-05T07:45:00.000Z",
        "farePerSeat": 200,
        "driver": {
          "id": "uuid",
          "fullName": "Ali Ahmed",
          "gender": "male"
        },
        "vehicle": {
          "id": "uuid",
          "make": "Toyota",
          "model": "Corolla",
          "color": "White",
          "registrationNumber": "ABC-1234"
        }
      },
      "pickupStop": { "id": "uuid", "stopName": "Nipa Chowrangi" },
      "dropStop": null
    }
  ]
}
```

---

#### `GET /api/booking-requests/incoming`

List all **PENDING** booking requests for rides owned by the authenticated driver. Only requests for `PUBLISHED` rides are returned. This lets the driver see who's asking to join their rides so they can accept or reject.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Incoming booking requests fetched successfully.",
  "data": [
    {
      "id": "booking-uuid",
      "status": "PENDING",
      "requestedSeats": 1,
      "requestedAt": "2026-04-05T07:30:00.000Z",
      "passenger": {
        "id": "uuid",
        "fullName": "Aiman Sabir",
        "gender": "female"
      },
      "ride": {
        "id": "uuid",
        "rideType": "INSTANT",
        "startLocation": "Clifton Block 5",
        "destinationLocation": "IBA City Campus",
        "departureTime": "2026-04-05T07:45:00.000Z",
        "seatsAvailable": 2,
        "farePerSeat": 200,
        "isUrgent": true
      },
      "pickupStop": { "id": "uuid", "stopName": "Nipa Chowrangi" },
      "dropStop": null
    }
  ]
}
```

---

#### `GET /api/booking-requests/:id`

Get details of a specific booking request. Accessible by either the passenger who made the request or the driver of the associated ride.

**Access Control:**
- Passenger who owns the booking ✅
- Driver of the ride ✅
- Any other user ❌ (403)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking request fetched successfully.",
  "data": {
    "id": "booking-uuid",
    "status": "PENDING",
    "requestedSeats": 1,
    "passenger": {
      "id": "uuid",
      "fullName": "Aiman Sabir",
      "gender": "female"
    },
    "ride": {
      "id": "uuid",
      "startLocation": "Maskan Gate",
      "destinationLocation": "IBA City Campus",
      "driver": {
        "id": "uuid",
        "fullName": "Ali Ahmed",
        "gender": "male"
      },
      "vehicle": {
        "id": "uuid",
        "make": "Toyota",
        "model": "Corolla",
        "color": "White",
        "registrationNumber": "ABC-1234"
      },
      "stops": [
        { "id": "uuid", "stopName": "Nipa Chowrangi", "sequence": 1 }
      ]
    },
    "pickupStop": { "id": "uuid", "stopName": "Nipa Chowrangi" },
    "dropStop": null
  }
}
```

---

#### `PATCH /api/booking-requests/:id/respond`

Driver accepts or rejects a booking request. On acceptance, the seat count is atomically decremented within a database transaction, and the occupancy mix is automatically updated for all future searchers. The passenger receives a notification with a navigation hint for the frontend.

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Validations:**
- `status` must be `ACCEPTED` or `REJECTED` (400)
- Only the ride driver can respond (403)
- Only `PENDING` requests can be responded to (400)
- Ride must be in `PUBLISHED` status (400)
- Must have enough available seats for acceptance — returns `409 Conflict` if another request already took the last seat

**Success Response (200) — Accepted:**
```json
{
  "success": true,
  "message": "Booking request accepted successfully.",
  "data": {
    "id": "booking-uuid",
    "status": "ACCEPTED",
    "respondedAt": "2026-04-05T07:32:00.000Z",
    "passenger": {
      "id": "uuid",
      "fullName": "Aiman Sabir",
      "gender": "female"
    },
    "ride": {
      "id": "uuid",
      "seatsAvailable": 1,
      "driver": { "...": "..." },
      "vehicle": { "...": "..." }
    },
    "passengerNavigation": "BOOKING_CONFIRMED",
    "passengerNotificationId": "notif-uuid",
    "passengerNotificationType": "BOOKING_REQUEST_ACCEPTED"
  }
}
```

**Passenger Navigation Behavior:**

| Ride Type   | Response   | `passengerNavigation` | Frontend Action                |
| ----------- | ---------- | --------------------- | ------------------------------ |
| `SCHEDULED` | `ACCEPTED` | `BOOKING_CONFIRMED`   | Show confirmation screen       |
| `INSTANT`   | `ACCEPTED` | `TRACK_RIDE`          | Redirect to live ride tracking |
| Any         | `REJECTED` | `REQUEST_REJECTED`    | Show rejection notice          |

**Passenger Notification Priority:**

| Ride Type  | Response   | Priority | Presentation    |
| ---------- | ---------- | -------- | --------------- |
| `INSTANT`  | `ACCEPTED` | `HIGH`   | `LIVE_TOAST`    |
| All others | Any        | `NORMAL` | `STANDARD_PUSH` |

---

#### `PATCH /api/booking-requests/:id/cancel`

Passenger cancels their booking. If the booking was already `ACCEPTED`, the seat is immediately freed up (atomically incremented) so other passengers can book it. The driver is notified of the cancellation.

**Validations:**
- Only the passenger who owns the booking can cancel (403)
- Only `PENDING` or `ACCEPTED` bookings can be cancelled (400)
- Cancel is allowed only before ride start

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking request cancelled successfully.",
  "data": {
    "id": "booking-uuid",
    "status": "CANCELLED",
    "cancelledAt": "2026-04-05T07:40:00.000Z",
    "passenger": {
      "id": "uuid",
      "fullName": "Aiman Sabir",
      "gender": "female"
    },
    "ride": {
      "id": "uuid",
      "seatsAvailable": 3
    },
    "driverNotificationType": "PASSENGER_CANCELLED_RIDE",
    "driverNotificationId": "notif-uuid"
  }
}
```

**Cancellation Logic:**

| Previous Status | Seat Restored?              | Driver Notification Priority           |
| --------------- | --------------------------- | -------------------------------------- |
| `PENDING`       | No                          | `NORMAL` / `STANDARD_PUSH`            |
| `ACCEPTED`      | ✅ Yes (incremented back)   | Depends on ride type (HIGH for instant)|

**Driver Notification for Cancellation:**

| Ride Type   | Priority | Presentation    |
| ----------- | -------- | --------------- |
| `INSTANT`   | `HIGH`   | `LIVE_TOAST`    |
| `SCHEDULED` | `NORMAL` | `STANDARD_PUSH` |

---

#### `DELETE /api/booking-requests/:id`

Permanently delete a booking request record. This is a hard delete used for cleaning up rejected, cancelled, or pending bookings. Accepted bookings must be cancelled first via the cancel endpoint.

**Validations:**
- Only the passenger who owns the booking can delete (403)
- `ACCEPTED` bookings cannot be deleted — they must be cancelled first (400)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking request deleted successfully.",
  "data": {
    "id": "booking-uuid"
  }
}
```

**Error (400) — Attempting to delete an accepted booking:**
```json
{
  "success": false,
  "message": "Accepted booking requests must be cancelled, not deleted."
}
```

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
| Driver cancels scheduled ride → all passengers alerted | Implemented in Workflow 1's ride deletion flow (`DELETE /api/rides/:id`). When a driver deletes a ride with accepted bookings, all affected passengers receive an urgent "Ride Cancelled" notification | `ride.service.js` (Workflow 1) |
| Driver cancels instant ride → critical alert to passenger | Same as above — the Workflow 1 ride deletion logic handles instant rides with appropriate alert priority to prevent passengers from waiting at pickup | `ride.service.js` (Workflow 1) |

---

## Database Schema (ERD)

The `BookingRequest` model added in Workflow 2 and its relationships:

```
┌────────────────┐                    ┌─────────────────┐
│      User      │                    │      Ride        │
│                │                    │                 │
│ id (PK)        │     1:N            │ id (PK)         │
│ fullName       │────────┐          │ driverId (FK)   │
│ ibaEmail (UQ)  │        │          │ vehicleId (FK)  │
│ gender         │        │          │ rideType        │
│ trustScore     │        │          │ status          │
│ isVerified     │        │          │ seatsAvailable  │
│ genderVerified │        │          │ farePerSeat     │
└────────────────┘        │          │ genderPreference│
                          │          └────────┬────────┘
                          │                   │
                          │ 1:N               │ 1:N
                          ▼                   ▼
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
                    │ createdAt                     │
                    │ updatedAt                     │
                    │                              │
                    │ @@index([passengerId, status]) │
                    │ @@index([rideId, status])      │
                    └──────────────────────────────┘

                    ┌──────────────────┐
                    │    RideStop       │
                    │                  │
                    │ id (PK)          │
                    │ rideId (FK)      │
                    │ stopName         │
                    │ sequence         │
                    │ lat, lng         │
                    │ isSuggested      │
                    │ isConfirmed      │
                    │                  │
                    │ pickupBookings[] │──▶ BookingRequest
                    │ dropBookings[]   │──▶ BookingRequest
                    └──────────────────┘
```

### Enums (Workflow 2 Relevant)

| Enum Name              | Values                                         | Usage                          |
| ---------------------- | ---------------------------------------------- | ------------------------------ |
| `BookingRequestStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` | Booking lifecycle states       |
| `RideType`             | `SCHEDULED`, `INSTANT`                         | Determines booking labels & notification priority |
| `GenderPreference`     | `ANY`, `FEMALES_ONLY`                          | Gender safety enforcement      |

---

## Version Control Practices

This project follows best practices for version control:

- **Meaningful Commit Messages** – Each commit describes the specific change made (e.g., `feat: add booking request CRUD`, `feat: add smart search with landmark matching`).
- **Feature Branches** – Development is done on feature branches (e.g., `feature/workflow-2`) and merged into `main` via pull requests.
- **Pull Requests** – Code changes are reviewed through pull requests before merging to the main branch.
- **`.gitignore`** – Sensitive files (`.env`) and dependencies (`node_modules/`) are excluded from version control.
- **Final Code on `main`** – The final version of milestone code is always merged into the `main` branch.

---

## Contributors

| Name  | Responsibility                                          |
| ----- | ------------------------------------------------------- |
| Aiman | Workflow 2 — Passenger Search & Booking (Demand Side)   |

---

## License

This project is developed for academic purposes as part of the Web-Based Application Development course.
