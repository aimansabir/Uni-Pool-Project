-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'IN_APP_TOAST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "destinationKey" TEXT,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "fareCap" DOUBLE PRECISION,
ADD COLUMN     "mappingProvider" TEXT,
ADD COLUMN     "routeGeometry" JSONB,
ADD COLUMN     "routeKey" TEXT,
ADD COLUMN     "suggestedFarePerSeat" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RideStop" ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSuggested" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RouteSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "destinationKey" TEXT,
    "startLocation" TEXT NOT NULL,
    "destinationLocation" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveRouteSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "destinationKey" TEXT,
    "startLocation" TEXT NOT NULL,
    "destinationLocation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveRouteSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteSubscription_routeKey_isActive_idx" ON "RouteSubscription"("routeKey", "isActive");

-- CreateIndex
CREATE INDEX "RouteSubscription_destinationKey_isActive_idx" ON "RouteSubscription"("destinationKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RouteSubscription_userId_routeKey_key" ON "RouteSubscription"("userId", "routeKey");

-- CreateIndex
CREATE INDEX "ActiveRouteSearch_routeKey_isActive_idx" ON "ActiveRouteSearch"("routeKey", "isActive");

-- CreateIndex
CREATE INDEX "ActiveRouteSearch_destinationKey_isActive_idx" ON "ActiveRouteSearch"("destinationKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveRouteSearch_userId_routeKey_key" ON "ActiveRouteSearch"("userId", "routeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RouteSubscription" ADD CONSTRAINT "RouteSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveRouteSearch" ADD CONSTRAINT "ActiveRouteSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
