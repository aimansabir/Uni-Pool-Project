/*
  Warnings:

  - You are about to drop the column `lastPingedAt` on the `ActiveRouteSearch` table. All the data in the column will be lost.
  - You are about to alter the column `durationMin` on the `Ride` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `createdAt` on the `RideStop` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `RideStop` table. All the data in the column will be lost.
  - You are about to drop the column `stopOrder` on the `RideStop` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RideStop` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,routeKey]` on the table `ActiveRouteSearch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,routeKey]` on the table `RouteSubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `destinationLocation` to the `ActiveRouteSearch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startLocation` to the `ActiveRouteSearch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLocation` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startLocation` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `RideStop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stopName` to the `RideStop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLocation` to the `RouteSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startLocation` to the `RouteSubscription` table without a default value. This is not possible if the table is not empty.
  - Made the column `color` on table `Vehicle` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'IN_APP_TOAST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'PENDING';
ALTER TYPE "NotificationStatus" ADD VALUE 'SENT';
ALTER TYPE "NotificationStatus" ADD VALUE 'FAILED';

-- DropForeignKey
ALTER TABLE "ActiveRouteSearch" DROP CONSTRAINT "ActiveRouteSearch_userId_fkey";

-- DropForeignKey
ALTER TABLE "BookingRequest" DROP CONSTRAINT "BookingRequest_passengerId_fkey";

-- DropForeignKey
ALTER TABLE "BookingRequest" DROP CONSTRAINT "BookingRequest_rideId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "RouteSubscription" DROP CONSTRAINT "RouteSubscription_userId_fkey";

-- AlterTable
ALTER TABLE "ActiveRouteSearch" DROP COLUMN "lastPingedAt",
ADD COLUMN     "destinationKey" TEXT,
ADD COLUMN     "destinationLocation" TEXT NOT NULL,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "startLocation" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "dropStopId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "pickupStopId" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requestedSeats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "payload" JSONB,
ALTER COLUMN "channel" SET DEFAULT 'EMAIL',
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "destinationKey" TEXT,
ADD COLUMN     "destinationLocation" TEXT NOT NULL,
ADD COLUMN     "routeKey" TEXT,
ADD COLUMN     "startLocation" TEXT NOT NULL,
ADD COLUMN     "targetSlot" TEXT,
ALTER COLUMN "durationMin" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "RideStop" DROP COLUMN "createdAt",
DROP COLUMN "name",
DROP COLUMN "stopOrder",
DROP COLUMN "updatedAt",
ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSuggested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "stopName" TEXT NOT NULL,
ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lng" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RouteSubscription" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "destinationKey" TEXT,
ADD COLUMN     "destinationLocation" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startLocation" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "behaviorScore" SET DEFAULT 100,
ALTER COLUMN "punctualityScore" SET DEFAULT 100,
ALTER COLUMN "safetyScore" SET DEFAULT 100;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "color" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ActiveRouteSearch_routeKey_isActive_idx" ON "ActiveRouteSearch"("routeKey", "isActive");

-- CreateIndex
CREATE INDEX "ActiveRouteSearch_destinationKey_isActive_idx" ON "ActiveRouteSearch"("destinationKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveRouteSearch_userId_routeKey_key" ON "ActiveRouteSearch"("userId", "routeKey");

-- CreateIndex
CREATE INDEX "BookingRequest_passengerId_status_idx" ON "BookingRequest"("passengerId", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_rideId_status_idx" ON "BookingRequest"("rideId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RidePayment_rideId_idx" ON "RidePayment"("rideId");

-- CreateIndex
CREATE INDEX "RidePayment_passengerId_idx" ON "RidePayment"("passengerId");

-- CreateIndex
CREATE INDEX "RidePayment_driverId_idx" ON "RidePayment"("driverId");

-- CreateIndex
CREATE INDEX "RidePayment_status_idx" ON "RidePayment"("status");

-- CreateIndex
CREATE INDEX "RideRating_bookingRequestId_idx" ON "RideRating"("bookingRequestId");

-- CreateIndex
CREATE INDEX "RideRating_raterId_idx" ON "RideRating"("raterId");

-- CreateIndex
CREATE INDEX "RideRating_rateeId_idx" ON "RideRating"("rateeId");

-- CreateIndex
CREATE INDEX "RouteSubscription_routeKey_isActive_idx" ON "RouteSubscription"("routeKey", "isActive");

-- CreateIndex
CREATE INDEX "RouteSubscription_destinationKey_isActive_idx" ON "RouteSubscription"("destinationKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RouteSubscription_userId_routeKey_key" ON "RouteSubscription"("userId", "routeKey");

-- AddForeignKey
ALTER TABLE "RouteSubscription" ADD CONSTRAINT "RouteSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveRouteSearch" ADD CONSTRAINT "ActiveRouteSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_pickupStopId_fkey" FOREIGN KEY ("pickupStopId") REFERENCES "RideStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_dropStopId_fkey" FOREIGN KEY ("dropStopId") REFERENCES "RideStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRating" ADD CONSTRAINT "RideRating_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
