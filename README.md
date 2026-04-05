# UniPool – University Carpooling Platform 🚗

> A web-based ride-sharing application exclusively for **IBA University** students and faculty. UniPool connects verified drivers with passengers heading to the same destination, reducing commute costs and promoting safer, gender-aware carpooling.

---

## Project Overview

UniPool solves the daily commuting challenge for university students by providing:

- **Verified-only access** – Only IBA email addresses (`@iba.edu.pk` / `@khi.iba.edu.pk`) can register
- **Smart Route Intelligence** – Automatic route mapping via OpenStreetMap + OSRM with landmark detection
- **Ride Type Toggle** – Support for **Scheduled** rides (targeting class slots) and **Instant/Flash** rides (leaving now)
- **Fair Pricing** – System-calculated fare suggestions with anti-overcharging caps
- **Gender-Aware Rides** – Verified female drivers can publish "Females Only" rides
- **Real-Time Notifications** – Email alerts for scheduled rides, live SSE toast pop-ups for instant rides
- **Smart Search** – Find rides by pickup, drop-off, or class time slot with landmark matching across route stops
- **Live Feed** – Urgent "Leaving Now" rides highlighted at the top of search results
- **Occupancy Safety** – Real-time gender composition displayed on every ride card (e.g., "1 Male, 2 Female")
- **Instant & Scheduled Booking** – Different booking flows with tiered notification priorities
- **Cancellation Handling** – Seat restoration, driver alerts, and passenger protection for both ride types
- **Live Navigation & Tracking** – Google Maps deep links for drivers, real-time location tracking for passengers
- **Pickup Verification** – License plate verification before boarding for safety
- **No-Show Handling** – Automatic 5-minute wait enforcement before marking no-shows
- **Payment Settlement** – Cash and JazzCash payment flow with two-step confirmation (passenger marks paid, driver confirms)
- **Mutual Ratings & Trust Score** – Passengers rate drivers on Punctuality & Safety, drivers rate passengers on Behavior, with automatic trust score recalculation

---

## Tech Stack

| Layer      | Technology            |
| ---------- | --------------------- |
| Backend    | Express.js (Node.js)  |
| Database   | PostgreSQL            |
| ORM        | Prisma                |
| Auth       | JWT + bcryptjs        |
| Mapping    | Nominatim + OSRM      |
| Real-time  | Server-Sent Events    |

---

## Repository Structure

```
Uni-Pool-Project/
├── unipool-backend/            # Backend API (Express.js + Prisma + PostgreSQL)
│   ├── prisma/                 # Database schema and migrations
│   ├── src/                    # Source code (routes, services, middlewares, utils)
│   ├── Backend_API_WF-1.md     # API Quick Reference for Workflow 1
│   ├── Backend_API_WF-2.md     # API Quick Reference for Workflow 2
│   ├── Backend_API_WF-3.md     # API Quick Reference for Workflow 3
│   ├── package.json            # Dependencies
│   ├── .env.example            # Environment variable template
│   └── README.md               # Detailed backend documentation & API reference
├── workflow.txt                # Workflow descriptions
└── README.md                   # This file (project overview)
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x
- **npm** ≥ 9.x

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/aimansabir/Uni-Pool-Project.git
cd Uni-Pool-Project/unipool-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and settings

# 4. Create the PostgreSQL database
# In psql: CREATE DATABASE unipool_db;

# 5. Run database migrations
npx prisma migrate dev --schema=./prisma/schema.prisma

# 6. Generate Prisma Client
npx prisma generate --schema=./prisma/schema.prisma

# 7. Start the development server
npm run dev
```

The API will be available at **http://localhost:3000**.

> 📖 For complete API documentation, endpoint references, request/response examples, and database schema details, see the **[Backend README](./unipool-backend/README.md)**.

---

## Implemented Workflows

### Workflow 1 — Driver Ride Publication (Supply Side)

The complete driver ride publication flow with two full CRUD entities:

1. **Vehicle Management** (Create, Read, Update, Delete)
   - Register vehicles with make, model, color, and registration number
   - Ownership verification prevents unauthorized access

2. **Ride Management** (Create, Read, Update, Delete)
   - Publish rides with Scheduled or Instant mode
   - Integrated Route Intelligence (geocoding, routing, landmark auto-tagging)
   - Smart fare estimation with price capping
   - Gender preference enforcement
   - Notification dispatch to route subscribers and active searchers

**Supporting Sub-Flows:**
- Route Intelligence Preview
- Route Subscriptions (Create/Read/Delete)
- Active Route Searches (Create/Ping/Deactivate)
- Notifications (Read/Mark Read/SSE Real-Time Stream)

### Workflow 2 — Passenger Search & Booking (Demand Side)

The complete passenger experience with Smart Search and Booking Request CRUD:

1. **Smart Search & Live Feed**
   - Search rides by pickup, drop-off, and target class slot
   - Landmark matching across start location, route key, and individual stop names
   - Urgent "Leaving Now" rides sorted to the top with `isUrgent` flag for frontend highlighting
   - Filter by ride type (`SCHEDULED`/`INSTANT`) or urgent-only

2. **Result Visualization (Safety & Fare)**
   - Live occupancy mix on every ride card (driver + accepted passengers by gender)
   - Fare per seat, suggested fare, and fare cap displayed
   - Route preview with GeoJSON geometry, ordered stops with lat/lng, and accepted passenger list

3. **Booking Request (Full CRUD)**
   - **Create**: Request a seat with pickup stop selection (required) and optional drop stop
   - **Read**: List all bookings; get specific booking (accessible by passenger or ride driver)
   - **Read**: Driver views incoming pending requests via dedicated endpoint
   - **Update**: Driver accepts/rejects; Passenger cancels
   - **Delete**: Hard-delete non-accepted bookings

4. **Instant vs. Scheduled Flow**
   - "Join Ride Instantly" vs. "Request Seat" labels
   - HIGH priority + LIVE_TOAST notifications for instant rides
   - TRACK_RIDE navigation hint for accepted instant bookings
   - BOOKING_CONFIRMED for accepted scheduled bookings

5. **Cancellation Handling**
   - Passenger cancel → seat restored (if accepted) + driver notified
   - Driver cancel → all booked passengers alerted (handled via Workflow 1's ride deletion)
   - Instant ride cancellations use elevated priority to prevent passengers from waiting

6. **Real-Time SSE Notifications**
   - Instant ride booking alerts are pushed to the driver in real time via Server-Sent Events
   - `GET /api/notifications/stream` — authenticated SSE endpoint for live push

### Workflow 3 — Live Navigation & Trust Cycle

The complete ride execution lifecycle with two full CRUD entities:

1. **Ride Execution & Tracking**
   - Driver starts ride → status transitions to `IN_PROGRESS`
   - Google Maps deep link generated with pre-filled waypoints
   - Real-time location updates and passenger tracking

2. **Pickup Verification & No-Show Handling**
   - Passenger verifies vehicle license plate before boarding
   - Driver marks arrival → 5-minute timer starts
   - After 5 minutes, driver can mark passenger as no-show

3. **Payment Settlement (CRUD Entity)**
   - Payment records auto-created on ride start
   - Passenger records payment method (Cash, JazzCash, Other)
   - Driver confirms payment received → status becomes `PAID`
   - No-show payments excluded from settlement flow

4. **Mutual Ratings (Full CRUD Entity)**
   - **Create**: Passenger rates driver (Punctuality + Safety stars); Driver rates passenger (Behavior stars)
   - **Read**: List ratings with filters (by ride, type, given/received); Get single rating; Get public trust score
   - **Update**: Original rater can update their rating
   - **Delete**: Original rater can delete their rating
   - Trust scores automatically recalculated on every rating change

---

## API Endpoints Summary

| Method   | Endpoint                                      | Description                        |
| -------- | --------------------------------------------- | ---------------------------------- |
| `POST`   | `/api/auth/register`                          | Register new user                  |
| `POST`   | `/api/auth/login`                             | Login and receive JWT              |
| `GET`    | `/api/auth/me`                                | Get current user profile           |
| `POST`   | `/api/vehicles`                               | Add a vehicle                      |
| `GET`    | `/api/vehicles`                               | List my vehicles                   |
| `GET`    | `/api/vehicles/:id`                           | Get vehicle by ID                  |
| `PUT`    | `/api/vehicles/:id`                           | Update a vehicle                   |
| `DELETE` | `/api/vehicles/:id`                           | Delete a vehicle                   |
| `POST`   | `/api/rides/intelligence/preview`             | Preview route intelligence         |
| `POST`   | `/api/rides`                                  | Publish a ride                     |
| `GET`    | `/api/rides`                                  | List my rides                      |
| `GET`    | `/api/rides/:id`                              | Get ride by ID                     |
| `PUT`    | `/api/rides/:id`                              | Update a ride                      |
| `DELETE` | `/api/rides/:id`                              | Delete a ride                      |
| `POST`   | `/api/route-subscriptions`                    | Subscribe to a route               |
| `GET`    | `/api/route-subscriptions`                    | List my subscriptions              |
| `DELETE` | `/api/route-subscriptions/:id`                | Delete a subscription              |
| `POST`   | `/api/active-searches`                        | Register active search             |
| `PATCH`  | `/api/active-searches/:id/ping`               | Heartbeat active search            |
| `PATCH`  | `/api/active-searches/:id/deactivate`         | Deactivate search                  |
| `GET`    | `/api/notifications`                          | List my notifications              |
| `PATCH`  | `/api/notifications/:id/read`                 | Mark notification as read          |
| `GET`    | `/api/notifications/stream`                   | SSE real-time notification stream  |
| `GET`    | `/api/search/rides`                           | Smart search for rides             |
| `GET`    | `/api/search/rides/:rideId/preview`           | Detailed ride preview              |
| `POST`   | `/api/booking-requests`                       | Request a seat on a ride           |
| `GET`    | `/api/booking-requests`                       | List passenger's bookings          |
| `GET`    | `/api/booking-requests/incoming`              | Driver lists incoming requests     |
| `GET`    | `/api/booking-requests/:id`                   | Get a specific booking             |
| `PATCH`  | `/api/booking-requests/:id/respond`           | Driver accepts/rejects booking     |
| `PATCH`  | `/api/booking-requests/:id/cancel`            | Passenger cancels booking          |
| `DELETE` | `/api/booking-requests/:id`                   | Delete a booking request           |
| `PATCH`  | `/api/ride-execution/rides/:rideId/start`     | Start a ride                       |
| `GET`    | `/api/ride-execution/rides/:rideId/navigation`| Get navigation deep link           |
| `PATCH`  | `/api/ride-execution/rides/:rideId/location`  | Update driver location             |
| `GET`    | `/api/ride-execution/rides/:rideId/track`     | Track ride in real-time            |
| `PATCH`  | `/api/ride-execution/rides/:rideId/complete`  | Complete a ride                    |
| `PATCH`  | `/api/ride-execution/bookings/:id/verify-plate`    | Verify vehicle plate          |
| `PATCH`  | `/api/ride-execution/bookings/:id/arrived-at-stop` | Mark arrival at stop          |
| `PATCH`  | `/api/ride-execution/bookings/:id/pickup`          | Mark passenger picked up      |
| `PATCH`  | `/api/ride-execution/bookings/:id/no-show`         | Mark passenger no-show        |
| `PATCH`  | `/api/ride-execution/bookings/:id/drop-off`        | Mark passenger dropped off    |
| `GET`    | `/api/payments/rides/:rideId/due`             | Get payments due                   |
| `PATCH`  | `/api/payments/:paymentId/mark-paid`          | Passenger records payment          |
| `PATCH`  | `/api/payments/:paymentId/confirm`            | Driver confirms payment            |
| `POST`   | `/api/ratings/passenger-to-driver`            | Passenger rates driver             |
| `POST`   | `/api/ratings/driver-to-passenger`            | Driver rates passenger             |
| `GET`    | `/api/ratings`                                | List my ratings                    |
| `GET`    | `/api/ratings/:id`                            | Get single rating                  |
| `GET`    | `/api/ratings/users/:userId/trust-score`      | Get public trust score             |
| `PUT`    | `/api/ratings/:id`                            | Update a rating                    |
| `DELETE` | `/api/ratings/:id`                            | Delete a rating                    |

---

## Version Control

- **Meaningful commit messages** describing each change
- **Feature branches** for isolated development
- **Pull requests** for code review before merging to `main`
- **`.gitignore`** excludes `node_modules/` and `.env`

---

## Contributors

| Name   | Responsibility                                          |
| ------ | ------------------------------------------------------- |
| Khizer | Workflow 1 — Driver Ride Publication (Supply Side)      |
| Khizer | Workflow 3 — Live Navigation & Trust Cycle              |
| Aiman  | Workflow 2 — Passenger Search & Booking (Demand Side)   |

---

## License

Developed for academic purposes — Web-Based Application Development course.
