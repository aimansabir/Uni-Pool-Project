const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rides = await prisma.ride.findMany({
    select: {
      id: true,
      startLocation: true,
      destinationLocation: true,
      routeKey: true,
      destinationKey: true
    }
  });
  console.log(JSON.stringify(rides, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
