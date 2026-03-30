# UniPool Backend API

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`

## Vehicles
- POST `/api/vehicles`
- GET `/api/vehicles`
- GET `/api/vehicles/:id`
- PUT `/api/vehicles/:id`
- DELETE `/api/vehicles/:id`

## Rides
- POST `/api/rides/intelligence/preview`
- POST `/api/rides`
- GET `/api/rides`
- GET `/api/rides/:id`
- PUT `/api/rides/:id`
- DELETE `/api/rides/:id`

## Route Subscriptions
- POST `/api/route-subscriptions`
- GET `/api/route-subscriptions`
- DELETE `/api/route-subscriptions/:id`

## Active Route Searches
- POST `/api/active-searches`
- PATCH `/api/active-searches/:id/ping`
- PATCH `/api/active-searches/:id/deactivate`

## Notifications
- GET `/api/notifications`
- PATCH `/api/notifications/:id/read`
- GET `/api/notifications/stream`

## Environment Variables
- DATABASE_URL
- JWT_SECRET
- PORT
- ROUTE_GEOCODER_BASE_URL
- ROUTE_ENGINE_BASE_URL
- NOMINATIM_EMAIL
- NOMINATIM_USER_AGENT
- FARE_BASE_PKR
- FARE_PER_KM_PKR
- FARE_MAX_MULTIPLIER
- LANDMARK_RADIUS_METERS
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- SMTP_FROM




## Backend Setup
1. `cd unipool-backend`
2. `npm install`
3. configure `.env`
4. `npx prisma migrate dev`
5. `npx prisma generate`
6. `npm run dev`