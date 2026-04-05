-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SSE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('SCHEDULED', 'INSTANT');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('ANY', 'FEMALES_ONLY');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RideParticipantStatus" AS ENUM ('BOOKED', 'PICKED_UP', 'NO_SHOW', 'DROPPED_OFF');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'JAZZCASH', 'OTHER');

-- CreateEnum
CREATE TYPE "RatingType" AS ENUM ('PASSENGER_TO_DRIVER', 'DRIVER_TO_PASSENGER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "behaviorScore" DOUBLE PRECISION,
ADD COLUMN     "genderVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punctualityScore" DOUBLE PRECISION,
ADD COLUMN     "safetyScore" DOUBLE PRECISION,
ADD COLUMN     "totalRatingsReceived" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rideType" "RideType" NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "seatsTotal" INTEGER NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "farePerSeat" DOUBLE PRECISION NOT NULL,
    "fareCap" DOUBLE PRECISION,
    "suggestedFarePerSeat" DOUBLE PRECISION,
    "genderPreference" "GenderPreference" NOT NULL DEFAULT 'ANY',
    "status" "RideStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "routeGeometry" JSONB,
    "distanceKm" DOUBLE PRECISION,
    "durationMin" DOUBLE PRECISION,
    "mappingProvider" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideStop" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "pickupStopName" TEXT,
    "dropoffStopName" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "participantStatus" "RideParticipantStatus",
    "pickedUpAt" TIMESTAMP(3),
    "noShowMarkedAt" TIMESTAMP(3),
    "droppedOffAt" TIMESTAMP(3),
    "plateVerified" BOOLEAN NOT NULL DEFAULT false,
    "plateVerifiedAt" TIMESTAMP(3),
    "arrivedAtStopAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveRouteSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveRouteSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RidePayment" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "confirmedByDriverAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RidePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRating" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "bookingRequestId" TEXT,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "ratingType" "RatingType" NOT NULL,
    "punctualityStars" INTEGER,
    "safetyStars" INTEGER,
    "behaviorStars" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RidePayment_bookingRequestId_key" ON "RidePayment"("bookingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RideRating_rideId_raterId_rateeId_ratingType_key" ON "RideRating"("rideId", "raterId", "rateeId", "ratingType");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideStop" ADD CONSTRAINT "RideStop_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteSubscription" ADD CONSTRAINT "RouteSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveRouteSearch" ADD CONSTRAINT "ActiveRouteSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidePayment" ADD CONSTRAINT "RidePayment_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidePayment" ADD CONSTRAINT "RidePayment_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidePayment" ADD CONSTRAINT "RidePayment_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidePayment" ADD CONSTRAINT "RidePayment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRating" ADD CONSTRAINT "RideRating_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRating" ADD CONSTRAINT "RideRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRating" ADD CONSTRAINT "RideRating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
