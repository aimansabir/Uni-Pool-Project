import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRides() {
  const rides = await prisma.ride.findMany({
    include: { driver: true, bookingRequests: { include: { passenger: true } } }
  });
  console.log(JSON.stringify(rides, null, 2));
}

checkRides()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
