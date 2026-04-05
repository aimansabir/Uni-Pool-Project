# ROOT README
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
│   ├── package.json          # Dependencies
│   ├── .env.example          # Environment variable template
│   └── README.md             # Detailed backend documentation & API reference
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

---

## API Endpoints Summary

| Method   | Endpoint                              | Description                      |
| -------- | ------------------------------------- | -------------------------------- |
| `POST`   | `/api/auth/register`                  | Register new user                |
| `POST`   | `/api/auth/login`                     | Login and receive JWT            |
| `GET`    | `/api/auth/me`                        | Get current user profile         |
| `POST`   | `/api/vehicles`                       | Add a vehicle                    |
| `GET`    | `/api/vehicles`                       | List my vehicles                 |
| `GET`    | `/api/vehicles/:id`                   | Get vehicle by ID                |
| `PUT`    | `/api/vehicles/:id`                   | Update a vehicle                 |
| `DELETE` | `/api/vehicles/:id`                   | Delete a vehicle                 |
| `POST`   | `/api/rides/intelligence/preview`     | Preview route intelligence       |
| `POST`   | `/api/rides`                          | Publish a ride                   |
| `GET`    | `/api/rides`                          | List my rides                    |
| `GET`    | `/api/rides/:id`                      | Get ride by ID                   |
| `PUT`    | `/api/rides/:id`                      | Update a ride                    |
| `DELETE` | `/api/rides/:id`                      | Delete a ride                    |
| `POST`   | `/api/route-subscriptions`            | Subscribe to a route             |
| `GET`    | `/api/route-subscriptions`            | List my subscriptions            |
| `DELETE` | `/api/route-subscriptions/:id`        | Delete a subscription            |
| `POST`   | `/api/active-searches`                | Register active search           |
| `PATCH`  | `/api/active-searches/:id/ping`       | Heartbeat active search          |
| `PATCH`  | `/api/active-searches/:id/deactivate` | Deactivate search                |
| `GET`    | `/api/notifications`                  | List my notifications            |
| `PATCH`  | `/api/notifications/:id/read`         | Mark notification as read        |
| `GET`    | `/api/notifications/stream`           | SSE real-time notification stream|

---

## Version Control

- **Meaningful commit messages** describing each change
- **Feature branches** for isolated development
- **Pull requests** for code review before merging to `main`
- **`.gitignore`** excludes `node_modules/` and `.env`

---

## Contributors

| Khizer | Workflow-1 |

---

## License

Developed for academic purposes — Web-Based Application Development course.
