# UniPool – University Carpooling Platform 🚗

> **Verified Campus Ride-Sharing for IBA Students**
> UniPool is a specialized ride-sharing platform designed exclusively for IBA University. It connects verified student drivers with passengers heading to campus, optimizing commute costs, reducing traffic, and fostering a safer, community-driven transit system.

---

## 🌟 Project Highlights

- **Verified-Only Access**: Exclusive registration for IBA emails (`@iba.edu.pk`).
- **Smart Route Intelligence**: Automated mapping, landmark detection, and fair-fare calculation via OpenStreetMap & OSRM.
- **Gender-Safe Carpooling**: Verified female-only ride options and real-time gender composition visibility.
- **Dynamic Ride Types**: Support for **Scheduled** (class slots) and **Instant** (leaving now) rides.
- **Live Tracking & Navigation**: Real-time GPS updates for passengers and Google Maps deep-links for drivers.
- **Trust & Accountability**: Mutual rating system and automated trust scores.

---

## 📂 Repository Structure

The project is organized as a monorepo containing two main components:

| Component | Description | Tech Stack |
| :--- | :--- | :--- |
| **[unipool-frontend](./unipool-frontend)** | High-fidelity, mobile-first React interface. | React 19, Vite, Vanilla CSS, Leaflet |
| **[unipool-backend](./unipool-backend)** | Robust RESTful API and database management. | Node.js, Express, PostgreSQL, Prisma |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x
- **npm** ≥ 9.x

### 2. Backend Setup
```bash
cd unipool-backend
npm install
cp .env.example .env        # Configure your DATABASE_URL and JWT_SECRET
npx prisma migrate dev      # Run database migrations
npx prisma generate         # Generate Prisma client
npm run dev                 # Starts API at http://localhost:3000
```

### 3. Frontend Setup
```bash
cd unipool-frontend
npm install
cp .env.example .env        # Set VITE_API_URL=http://localhost:3000
npm run dev                 # Starts App at http://localhost:5173
```

---

## 🛠️ Implemented Workflows

### Workflow 1 — Driver Supply (Supply Side)
- **Vehicle Management**: Register and manage multiple vehicles.
- **Ride Publication**: Smart ride creation with route intelligence, stop sequencing, and fare suggestions.
- **Supply Intelligence**: Automatic landmark detection along routes to simplify search.

### Workflow 2 — Passenger Search & Booking (Demand Side)
- **Smart Search**: Find rides by destination, class time-slots, or landmarks.
- **Live Feed**: Real-time "Leaving Now" rides highlighted for urgent commutes.
- **Booking Management**: Request seats, select pickup stops, and receive instant notifications.

### Workflow 3 — Live Execution & Trust Cycle
- **Live Navigation**: Turn-by-turn routing for drivers via Google Maps API integration.
- **Real-Time Tracking**: Live location heartbeats allowing passengers to track their ride.
- **Safety Verification**: License plate verification and arrived-at-stop timers.
- **Settlement & Ratings**: Integrated payment recording and mutual rating system to build community trust.

---

## 👥 Contributors

| Name | Role | Core Responsibility |
| :--- | :--- | :--- |
| **Khizer** | Backend & Frontend | Auth, Workflow 1 (Supply), Workflow 3 (Live Execution) |
| **Aiman** | Backend & Frontend | Workflow 2 (Demand), UI Polishing, Search Optimization |

---

## 📜 Academic Disclaimer
This project was developed for academic purposes as part of the **Web-Based Application Development** course. It demonstrates full-stack proficiency in modern web technologies and complex business logic implementation.

---

> 📖 For detailed technical documentation, visit the respective sub-directories:
> - **[Backend Reference](./unipool-backend/README.md)** (API Endpoints, DB Schema, ERD)
> - **[Frontend Reference](./unipool-frontend/README.md)** (Component Structure, Design Tokens, UX flow)
