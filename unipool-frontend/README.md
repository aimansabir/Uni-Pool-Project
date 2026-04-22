# UniPool Frontend

> **University Carpooling Platform — React Frontend**
> A responsive, mobile-first React frontend for UniPool, built with Vite and designed to match the project's Figma wireframes pixel-by-pixel.

---

## Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Framework   | React 19                |
| Bundler     | Vite 8                  |
| Routing     | React Router v7         |
| HTTP Client | Axios                   |
| Maps        | Leaflet + OpenStreetMap  |
| Toasts      | react-hot-toast         |
| Styling     | Vanilla CSS (Modular)   |

---

## Getting Started

### 1. Install Dependencies

```bash
cd unipool-frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your backend URL:

```
VITE_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

The app will start at **http://localhost:5173**

### 4. Production Build

```bash
npm run build
```

---

## Project Structure

```
unipool-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/                    # API layer (Axios modules per resource)
│   │   ├── client.js           # Axios instance + interceptors
│   │   ├── auth.api.js
│   │   ├── vehicles.api.js
│   │   ├── rides.api.js
│   │   └── notifications.api.js
│   ├── components/
│   │   └── common/             # Reusable UI primitives
│   │       ├── Button/
│   │       ├── Input/
│   │       ├── Modal/
│   │       ├── Spinner/
│   │       ├── EmptyState/
│   │       ├── ConfirmDialog/
│   │       └── Badge/
│   ├── context/
│   │   ├── AuthContext.jsx     # Auth state management
│   │   └── ToastContext.jsx    # Global notifications
│   ├── layouts/
│   │   ├── AppLayout.jsx       # Authenticated layout + bottom nav
│   │   ├── AuthLayout.jsx      # Login/register layout
│   │   ├── Header.jsx
│   │   └── BottomNav.jsx
│   ├── pages/
│   │   ├── auth/               # Login, Register, OTP, Role Select
│   │   ├── wf1/                # Dashboard, Vehicles, Rides, Notifications
│   │   ├── ProfilePage.jsx
│   │   ├── MessagesPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── routes/
│   │   ├── AppRoutes.jsx       # Route definitions
│   │   └── ProtectedRoute.jsx  # Auth guard
│   ├── styles/
│   │   ├── variables.css       # Design tokens
│   │   └── global.css          # Reset + global styles
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── storage.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
└── package.json
```

---

## Implemented Features

### Authentication
- Login with IBA email + password
- Registration with full validation (IBA email domain enforcement)
- OTP verification screen (UI isolated, backend-agnostic)
- Role selection: Driver / Passenger

### Workflow 1 — Driver Ride Publication (Khizer)
- **Dashboard**: Welcome card, offer/find ride buttons, stats, recent activities
- **Vehicle Management**: Full CRUD (list, add, edit, delete) with confirmation dialogs
- **Ride Publishing**: Multi-field form with route intelligence preview, suggested stops, fare calculation, ride type toggle (Scheduled/Instant), seats selector, gender preference
- **My Rides**: Filterable list by status (Published, In Progress, Completed)
- **Ride Detail**: Carpool room view with route, stops, vehicle info, start/cancel actions
- **Notifications**: List with read/unread states, channel icons, time-ago formatting

### Shared
- **Profile**: Read-only user info, trust score, logout
- **Messages**: "Coming Soon" placeholder
- **404 Page**: Friendly error page with navigation

---

## Design Approach

This frontend preserves the **mobile-app aesthetic** from the Figma wireframes:

- **430px max-width** centered on desktop — looks like a phone screen
- **Bottom navigation bar** with 5 tabs (Home, Map, Messages, Pooling, Profile)
- **Amber/orange (#F3A32D)** primary color scheme matching Figma exactly
- **Teal (#18A085)** accent color for success/action states
- **Inter** font family from Google Fonts
- **Smooth animations** on page transitions and interactions
- **Toast notifications** for all success/error feedback

---

## Team Contributions

| Member  | Scope |
|---------|-------|
| **Khizer** | Auth + Workflow 1 (Driver Ride Publication) + Workflow 3 (Live Navigation) |
| **Aiman** | Workflow 2 (Passenger Search & Booking) |

---

## Environment Variables

| Variable       | Required | Default                 | Description           |
|----------------|----------|-------------------------|-----------------------|
| `VITE_API_URL` | ✅       | `http://localhost:3000` | Backend API base URL  |
