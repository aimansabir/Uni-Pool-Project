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
├── unipool-backend/          # Backend API (Express.js + Prisma + PostgreSQL)
│   ├── prisma/               # Database schema and migrations
│   ├── src/                  # Source code (routes, services, middlewares, utils)
│   ├── Backend_API_WF-3.md   # API Quick Reference for Workflow 3
│   ├── package.json          # Dependencies
│   ├── .env.example          # Environment variable template
│   └── README.md             # Detailed backend documentation & API reference
├── workflow.txt              # Workflow descriptions
└── README.md                 # This file (project overview)
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

| Method   | Endpoint                                                          | Description                      |
| -------- | ----------------------------------------------------------------- | -------------------------------- |
| `POST`   | `/api/auth/register`                                              | Register new user                |
| `POST`   | `/api/auth/login`                                                 | Login and receive JWT            |
| `GET`    | `/api/auth/me`                                                    | Get current user profile         |
| `PATCH`  | `/api/ride-execution/rides/:rideId/start`                        | Start a ride                     |
| `GET`    | `/api/ride-execution/rides/:rideId/navigation`                   | Get navigation deep link         |
| `PATCH`  | `/api/ride-execution/rides/:rideId/location`                     | Update driver location           |
| `GET`    | `/api/ride-execution/rides/:rideId/track`                        | Track ride in real-time          |
| `PATCH`  | `/api/ride-execution/rides/:rideId/complete`                     | Complete a ride                  |
| `PATCH`  | `/api/ride-execution/bookings/:bookingRequestId/verify-plate`    | Verify vehicle plate             |
| `PATCH`  | `/api/ride-execution/bookings/:bookingRequestId/arrived-at-stop` | Mark arrival at stop             |
| `PATCH`  | `/api/ride-execution/bookings/:bookingRequestId/pickup`          | Mark passenger picked up         |
| `PATCH`  | `/api/ride-execution/bookings/:bookingRequestId/no-show`         | Mark passenger no-show           |
| `PATCH`  | `/api/ride-execution/bookings/:bookingRequestId/drop-off`        | Mark passenger dropped off       |
| `GET`    | `/api/payments/rides/:rideId/due`                                | Get payments due                 |
| `PATCH`  | `/api/payments/:paymentId/mark-paid`                             | Passenger records payment        |
| `PATCH`  | `/api/payments/:paymentId/confirm`                               | Driver confirms payment          |
| `POST`   | `/api/ratings/passenger-to-driver`                               | Passenger rates driver           |
| `POST`   | `/api/ratings/driver-to-passenger`                               | Driver rates passenger           |
| `GET`    | `/api/ratings`                                                   | List my ratings                  |
| `GET`    | `/api/ratings/:id`                                               | Get single rating                |
| `GET`    | `/api/ratings/users/:userId/trust-score`                         | Get public trust score           |
| `PUT`    | `/api/ratings/:id`                                               | Update a rating                  |
| `DELETE` | `/api/ratings/:id`                                               | Delete a rating                  |

---

## Version Control

- **Meaningful commit messages** describing each change
- **Feature branches** for isolated development
- **Pull requests** for code review before merging to `main`
- **`.gitignore`** excludes `node_modules/` and `.env`

---

## Contributors

| Khizer | Workflow-3 |

---

## License

Developed for academic purposes — Web-Based Application Development course.
