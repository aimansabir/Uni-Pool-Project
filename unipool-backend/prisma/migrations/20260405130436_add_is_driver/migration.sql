/*
  Warnings:

  - The values [MALES_ONLY] on the enum `GenderPreference` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GenderPreference_new" AS ENUM ('ANY', 'FEMALES_ONLY');
ALTER TABLE "public"."Ride" ALTER COLUMN "genderPreference" DROP DEFAULT;
ALTER TABLE "Ride" ALTER COLUMN "genderPreference" TYPE "GenderPreference_new" USING ("genderPreference"::text::"GenderPreference_new");
ALTER TYPE "GenderPreference" RENAME TO "GenderPreference_old";
ALTER TYPE "GenderPreference_new" RENAME TO "GenderPreference";
DROP TYPE "public"."GenderPreference_old";
ALTER TABLE "Ride" ALTER COLUMN "genderPreference" SET DEFAULT 'ANY';
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'IN_APP';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDriver" BOOLEAN NOT NULL DEFAULT false;
