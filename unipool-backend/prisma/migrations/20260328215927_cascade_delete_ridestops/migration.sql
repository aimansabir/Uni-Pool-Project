-- DropForeignKey
ALTER TABLE "RideStop" DROP CONSTRAINT "RideStop_rideId_fkey";

-- AddForeignKey
ALTER TABLE "RideStop" ADD CONSTRAINT "RideStop_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
