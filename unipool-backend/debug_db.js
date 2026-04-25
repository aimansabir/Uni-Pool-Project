const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rides = await prisma.ride.findMany({
    select: {
      id: true,
      startLocation: true,
      destinationLocation: true,
      targetSlot: true,
      rideType: true,
      departureTime: true,
      status: true
    }
  });
  console.log(JSON.stringify(rides, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
