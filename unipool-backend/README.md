# UniPool Backend README INSIDE BACKEND FOLDER

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
│   │   └── routeSubscription.routes.js # POST /, GET /, DELETE /:id
│   ├── services/                  # Business logic layer (no HTTP awareness)
│   │   ├── auth.service.js        # Register, login, getMe
│   │   ├── vehicle.service.js     # Vehicle CRUD operations
│   │   ├── ride.service.js        # Ride CRUD + intelligence integration
│   │   ├── mapping.service.js     # Geocoding, routing, landmark detection, fare calc
│   │   ├── notification.service.js# Notification dispatch (email + SSE toast)
│   │   ├── activeSearch.service.js# Active route search management
│   │   └── routeSubscription.service.js # Route subscription management
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
- **Route Subscriptions** (Create/Read/Delete) – Passengers subscribe to routes for email notifications.
- **Active Route Searches** (Create/Ping/Deactivate) – Tracks active passengers for instant ride toast alerts.
- **Notifications** (Read/Mark Read/SSE Stream) – Delivers scheduled email notifications and instant toast pop-ups via Server-Sent Events.

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "driverId": "uuid",
    "make": "Toyota",
    "model": "Corolla",
    "color": "White",
    "registrationNumber": "ABC-1234",
    "imageUrl": null,
    "createdAt": "2026-04-01T12:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z"
  }
}
```

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle updated.",
  "data": { "...updated vehicle object..." }
}
```

---

#### `DELETE /api/vehicles/:id`

Delete a vehicle. Cannot delete if it is attached to any existing rides.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle deleted.",
  "data": null
}
```

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

**Success Response (201):**
```json
{
  "success": true,
  "message": "Ride published successfully.",
  "data": {
    "id": "uuid",
    "driverId": "uuid",
    "vehicleId": "uuid",
    "startLocation": "Maskan Gate",
    "destinationLocation": "IBA City Campus",
    "departureTime": "2026-04-05T07:45:00.000Z",
    "targetSlot": "08:30 AM Class",
    "rideType": "SCHEDULED",
    "seatsTotal": 3,
    "seatsAvailable": 3,
    "farePerSeat": 200,
    "genderPreference": "ANY",
    "status": "PUBLISHED",
    "isUrgent": false,
    "routeKey": "maskan-gate__iba-city-campus",
    "distanceKm": 12.5,
    "durationMin": 28,
    "suggestedFarePerSeat": 180,
    "fareCap": 230,
    "mappingProvider": "Nominatim + OSRM",
    "routeGeometry": { "...GeoJSON..." },
    "vehicle": { "...vehicle object..." },
    "stops": [
      {
        "id": "uuid",
        "stopName": "Nipa Chowrangi",
        "sequence": 1,
        "lat": 24.9178,
        "lng": 67.0971,
        "isSuggested": false,
        "isConfirmed": true
      }
    ]
  }
}
```

---

#### `GET /api/rides`

List all rides published by the authenticated driver.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [ { "...ride objects with vehicle and stops..." } ]
}
```

---

#### `GET /api/rides/:id`

Get details of a specific ride (must belong to authenticated driver).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": { "...full ride object with vehicle and stops..." }
}
```

---

#### `PUT /api/rides/:id`

Update an existing ride. Route intelligence is automatically refreshed if route-related fields change. 

**Request Body (partial update):**
```json
{
  "seatsTotal": 4,
  "farePerSeat": 180,
  "confirmedStops": []
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride updated successfully.",
  "data": { "...updated ride object..." }
}
```

---

#### `DELETE /api/rides/:id`

Delete a ride. If the ride has accepted bookings, all affected passengers are notified (via in-app toast and SSE for instant rides).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ride deleted successfully.",
  "data": null
}
```

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "Route intelligence ready.",
  "data": {
    "mappingProvider": "Nominatim + OSRM",
    "startPoint": { "label": "...", "lat": 24.92, "lng": 67.09 },
    "destinationPoint": { "label": "...", "lat": 24.83, "lng": 67.03 },
    "distanceKm": 15.2,
    "durationMin": 35,
    "routeGeometry": { "type": "LineString", "coordinates": [...] },
    "suggestedLandmarks": [
      { "stopName": "Nipa Chowrangi", "sequence": 1, "lat": 24.917, "lng": 67.097, "isSuggested": true, "isConfirmed": false }
    ],
    "fareSuggestion": {
      "suggestedFarePerSeat": 150,
      "fareCap": 190
    },
    "rideType": "SCHEDULED",
    "departureTime": "2026-04-05T07:45:00.000Z",
    "isUrgent": false,
    "routeKey": "maskan-gate__clifton",
    "destinationKey": "clifton",
    "routeOptions": [
      {
        "optionNumber": 1,
        "isPrimary": true,
        "distanceKm": 15.2,
        "durationMin": 35,
        "roadHighlights": ["University Road", "Shahrah-e-Faisal"],
        "routeGeometry": { "...GeoJSON..." },
        "suggestedLandmarks": [...]
      }
    ]
  }
}
```

---

### 5. Route Subscriptions

> Passengers subscribe to email notifications for scheduled rides on specific routes.

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

**Success Response (201):**
```json
{
  "success": true,
  "message": "Route subscription saved.",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "routeKey": "maskan-gate__iba-city-campus",
    "destinationKey": "iba-city-campus",
    "startLocation": "Maskan Gate",
    "destinationLocation": "IBA City Campus",
    "channel": "EMAIL",
    "isActive": true
  }
}
```

---

#### `GET /api/route-subscriptions`

List all route subscriptions for the authenticated user.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [ { "...subscription objects..." } ]
}
```

---

#### `DELETE /api/route-subscriptions/:id`

Delete a route subscription.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Route subscription deleted.",
  "data": null
}
```

---

### 6. Active Route Searches

> Tracks which passengers are currently searching for rides on a route (used for instant ride toast alerts via SSE).

#### `POST /api/active-searches`

Register or re-activate an active route search.

**Request Body:**
```json
{
  "startLocation": "Clifton",
  "destinationLocation": "IBA City Campus"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Active route search saved.",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "routeKey": "clifton__iba-city-campus",
    "isActive": true,
    "lastSeenAt": "2026-04-04T12:00:00.000Z"
  }
}
```

---

#### `PATCH /api/active-searches/:id/ping`

Send a heartbeat to keep the search active.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Active route search refreshed.",
  "data": { "...updated search with new lastSeenAt..." }
}
```

---

#### `PATCH /api/active-searches/:id/deactivate`

Deactivate a route search.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Active route search deactivated.",
  "data": { "...search with isActive: false..." }
}
```

---

### 7. Notifications

#### `GET /api/notifications`

List all notifications for the authenticated user (newest first).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "rideId": "uuid",
      "channel": "EMAIL",
      "status": "SENT",
      "title": "New scheduled ride on your subscribed route",
      "message": "Maskan Gate → IBA City Campus at 4/5/2026, 12:45:00 PM",
      "payload": { "rideId": "uuid", "routeKey": "...", "farePerSeat": 200 },
      "createdAt": "2026-04-04T12:00:00.000Z"
    }
  ]
}
```

---

#### `PATCH /api/notifications/:id/read`

Mark a notification as read.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read.",
  "data": { "...notification with status: READ..." }
}
```

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
```

### Enums

| Enum Name             | Values                          |
| --------------------- | ------------------------------- |
| `Gender`              | `male`, `female`                |
| `UserRole`            | `student`, `admin`              |
| `RideType`            | `SCHEDULED`, `INSTANT`          |
| `RideStatus`          | `PUBLISHED`, `CANCELLED`, `COMPLETED` |
| `GenderPreference`    | `ANY`, `FEMALES_ONLY`           |
| `NotificationChannel` | `EMAIL`, `IN_APP_TOAST`         |
| `NotificationStatus`  | `PENDING`, `SENT`, `FAILED`, `READ` |

---

## Version Control Practices

This project follows best practices for version control:

- **Meaningful Commit Messages** – Each commit describes the specific change made (e.g., `feat: add ride CRUD endpoints`, `fix: cascade delete for ride stops`).
- **Feature Branches** – Development is done on feature branches (e.g., `feature/workflow-1`, `feature/ride-intelligence`) and merged into `main` via pull requests.
- **Pull Requests** – Code changes are reviewed through pull requests before merging to the main branch.
- **`.gitignore`** – Sensitive files (`.env`) and dependencies (`node_modules/`) are excluded from version control.
- **Final Code on `main`** – The final version of milestone code is always merged into the `main` branch.

---

## Contributors

| Khizer | Workflow-1 |

---

## License

This project is developed for academic purposes as part of the Web-Based Application Development course.
