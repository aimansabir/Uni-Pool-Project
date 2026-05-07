const prisma = require('./src/lib/prisma');
async function create() {
  const passengerId = 'abcfc551-bdb0-4ee6-b6a7-07d004b0b2e3';
  const driver = await prisma.user.findFirst({ where: { ibaEmail: 'm.khizer.28991@khi.iba.edu.pk' } });
  const ride = await prisma.ride.findFirst({ where: { driverId: driver.id, status: 'PUBLISHED' } });

  if (!ride) {
    console.log("No published ride found for Khizer");
    return;
  }

  const booking = await prisma.bookingRequest.create({
    data: {
      passengerId: passengerId,
      rideId: ride.id,
      status: 'PENDING',
      requestedSeats: 1
    }
  });
  console.log('Created test booking request:', booking.id);
}
create().finally(() => prisma.$disconnect());
