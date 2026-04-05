-- Create enum types
CREATE TYPE "RideType" AS ENUM ('SCHEDULED', 'INSTANT');
CREATE TYPE "GenderPreference" AS ENUM ('ANY', 'FEMALES_ONLY');
CREATE TYPE "RideStatus" AS ENUM ('PUBLISHED', 'CANCELLED', 'COMPLETED');

-- Normalize existing values
UPDATE "Ride" SET "rideType" = UPPER(TRIM("rideType"));
UPDATE "Ride" SET "genderPreference" = UPPER(TRIM("genderPreference"));
UPDATE "Ride" SET "status" = UPPER(TRIM("status"));

-- Clean invalid existing values
UPDATE "Ride"
SET "rideType" = 'SCHEDULED'
WHERE "rideType" NOT IN ('SCHEDULED', 'INSTANT');

UPDATE "Ride"
SET "genderPreference" = 'ANY'
WHERE "genderPreference" NOT IN ('ANY', 'FEMALES_ONLY');

UPDATE "Ride"
SET "status" = 'PUBLISHED'
WHERE "status" NOT IN ('PUBLISHED', 'CANCELLED', 'COMPLETED');

-- Drop defaults first
ALTER TABLE "Ride"
  ALTER COLUMN "rideType" DROP DEFAULT,
  ALTER COLUMN "genderPreference" DROP DEFAULT,
  ALTER COLUMN "status" DROP DEFAULT;

-- Convert text columns to enums
ALTER TABLE "Ride"
  ALTER COLUMN "rideType" TYPE "RideType"
    USING ("rideType"::text::"RideType"),
  ALTER COLUMN "genderPreference" TYPE "GenderPreference"
    USING ("genderPreference"::text::"GenderPreference"),
  ALTER COLUMN "status" TYPE "RideStatus"
    USING ("status"::text::"RideStatus");

-- Restore defaults
ALTER TABLE "Ride"
  ALTER COLUMN "genderPreference" SET DEFAULT 'ANY',
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';