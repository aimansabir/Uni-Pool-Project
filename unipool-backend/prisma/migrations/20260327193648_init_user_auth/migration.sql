-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "ibaEmail" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "studentErp" TEXT,
    "gender" "Gender" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ibaEmail_key" ON "User"("ibaEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentErp_key" ON "User"("studentErp");
