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
- **Smart Search** – Find rides by pickup, drop-off, or class time slot with landmark matching across route stops
- **Live Feed** – Urgent "Leaving Now" rides highlighted at the top of search results
- **Occupancy Safety** – Real-time gender composition displayed on every ride card (e.g., "1 Male, 2 Female")
- **Instant & Scheduled Booking** – Different booking flows with tiered notification priorities
- **Cancellation Handling** – Seat restoration, driver alerts, and passenger protection for both ride types

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
│   ├── Backend_API_WF-2.md     # API Quick Reference for Workflow 2
│   ├── package.json            # Dependencies
│   ├── .env.example            # Environment variable template
│   └── README.md               # Detailed backend documentation & API reference (Workflow 2)
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
   - _Validation notes:_
     - `pickupStopId` is required
     - `dropStopId` is optional
     - Only one seat per booking request is allowed
     - Pickup and drop must follow route order

4. **Instant vs. Scheduled Flow**
   - "Join Ride Instantly" vs. "Request Seat" labels
   - HIGH priority + LIVE_TOAST notifications for instant rides
   - TRACK_RIDE navigation hint for accepted instant bookings
   - BOOKING_CONFIRMED for accepted scheduled bookings

5. **Cancellation Handling**
   - Passenger cancel → seat restored (if accepted) + driver notified
   - Driver cancel → all booked passengers alerted (handled via Workflow 1's ride deletion)
   - Instant ride cancellations use elevated priority to prevent passengers from waiting
   - Cancel is allowed only before ride start
   - Accept can return `409 Conflict` if another request already took the last seat

6. **Real-Time SSE Notifications**
   - Instant ride booking alerts are pushed to the driver in real time via Server-Sent Events
   - `GET /api/notifications/stream` — authenticated SSE endpoint for live push

---

## API Endpoints Summary

| Method   | Endpoint                                      | Description                        |
| -------- | --------------------------------------------- | ---------------------------------- |
| `POST`   | `/api/auth/register`                          | Register new user                  |
| `POST`   | `/api/auth/login`                             | Login and receive JWT              |
| `GET`    | `/api/auth/me`                                | Get current user profile           |
| `GET`    | `/api/search/rides`                           | Smart search for rides             |
| `GET`    | `/api/search/rides/:rideId/preview`           | Detailed ride preview              |
| `POST`   | `/api/booking-requests`                       | Request a seat on a ride           |
| `GET`    | `/api/booking-requests`                       | List passenger's bookings          |
| `GET`    | `/api/booking-requests/incoming`              | Driver lists incoming booking requests |
| `GET`    | `/api/booking-requests/:id`                   | Get a specific booking             |
| `PATCH`  | `/api/booking-requests/:id/respond`           | Driver accepts/rejects booking     |
| `PATCH`  | `/api/booking-requests/:id/cancel`            | Passenger cancels booking          |
| `DELETE` | `/api/booking-requests/:id`                   | Delete a booking request           |
| `GET`    | `/api/notifications/stream`                   | SSE stream for real-time push      |

---

## Version Control

- **Meaningful commit messages** describing each change
- **Feature branches** for isolated development
- **Pull requests** for code review before merging to `main`
- **`.gitignore`** excludes `node_modules/` and `.env`

---

## Contributors

| Aiman | Workflow-2 |

---

## License

Developed for academic purposes — Web-Based Application Development course.
