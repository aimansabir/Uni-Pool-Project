# UniPool Frontend — Premium Carpooling Interface 🚗

> **University Ride-Sharing — High-Fidelity React Experience**
> A responsive, mobile-first React frontend for UniPool, designed to bridge the gap between campus commuters. Built with **React 19**, **Vite**, and **Vanilla CSS** for pixel-perfect fidelity to Figma wireframes.

---

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Backend API** running (Default: `http://localhost:3000`)

### 2. Installation
```bash
# Navigate to the frontend directory
cd unipool-frontend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file from the template:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your active backend:
```env
VITE_API_URL=http://localhost:3000
```

### 4. Launch Development Server
```bash
npm run dev
```
The application will be accessible at **http://localhost:5173**.

---

## 🛠️ Tech Stack & Design System

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | React 19 | Modern component-based architecture with latest hooks. |
| **Build Tool** | Vite 8 | Ultra-fast HMR and optimized production bundling. |
| **Routing** | React Router v7 | Seamless SPA navigation and protected route handling. |
| **State Mgmt** | React Context | Lightweight global state for Auth and UI notifications. |
| **Styling** | Vanilla CSS (Modular) | Maximum flexibility to match Figma designs exactly. |
| **Mapping** | Leaflet + OSM | Open-source, high-performance interactive maps. |
| **Feedback** | React Hot Toast | Responsive, non-intrusive notification system. |

### Design Philosophy
UniPool follows a **Mobile-First App Shell** design:
- **Responsive Layout**: Optimized for 430px (iPhone Pro Max) width, centered on desktop for a native app feel.
- **Brand Identity**: Primary Amber (`#F3A32D`) and Accent Teal (`#18A085`) palette.
- **Typography**: Clean, professional "Inter" font family.
- **Interactions**: Smooth CSS transitions and micro-animations for high-end UX.

---

## ✨ Key Features

### 🔐 Auth & Onboarding
- **Identity Guard**: IBA-email-only registration (`@iba.edu.pk`).
- **OTP Verification**: Clean, dedicated verification screen.
- **Role Selection**: Seamlessly toggle between Driver and Passenger personas.
- **Smart Redirects**: Context-aware routing based on auth status.

### 🚗 Workflow 1: Driver Supply (Supply Side)
- **Vehicle Vault**: Manage your fleet with full CRUD support and vehicle imagery.
- **Intelligence Publishing**: Smart ride creation with route preview, stop sequence, and fare suggestions.
- **Supply Dashboard**: High-level stats on rides offered and earnings.
- **Real-time Notifications**: Live SSE stream for incoming booking alerts.

### 🔍 Workflow 2: Passenger Search (Demand Side)
- **Smart Search**: Find rides by destination or class time-slots.
- **Live Feed**: Urgent "Leaving Now" rides highlighted at the top.
- **Occupancy Insights**: Visual breakdown of gender composition for safety.
- **Booking Lifecycle**: Request seats, select pickup stops, and track booking status.

### 📍 Workflow 3: Live Navigation & Trust (Execution)
- **Driver Navigation**: Google Maps deep-links for optimized turn-by-turn routing.
- **Passenger Tracking**: Real-time driver location updates on interactive maps.
- **Verification System**: License plate confirmation before boarding.
- **Settlement & Ratings**: Integrated JazzCash/Cash payment flow and mutual rating system.

---

## 📂 Project Structure

```bash
unipool-frontend/
├── src/
│   ├── api/          # Axios services mapped to backend endpoints
│   ├── components/   # Atomic UI components (Buttons, Modals, Cards)
│   ├── context/      # Global state (Auth, Toast, Sidebar)
│   ├── layouts/      # AppShell, BottomNav, and AuthLayout
│   ├── pages/        # Main views grouped by Workflow (wf1, wf2, wf3)
│   ├── routes/       # Route definitions and Auth guards
│   ├── styles/       # CSS Design Tokens and Global resets
│   └── utils/        # Constants, Formatters, and Validators
├── public/           # Static assets (Favicons, Icons)
└── index.html        # SPA entry point
```

---

## 👥 Contributors & Responsibilities

| Contributor | Focus Areas |
| :--- | :--- |
| **Khizer** | Auth, Workflow 1 (Supply), Workflow 3 (Live Execution), Core Layout |
| **Aiman** | Workflow 2 (Passenger Search), UI Polishing, Form Validations |

---

## 📄 License
This project is developed for academic purposes as part of the **Web-Based Application Development** course at IBA.

