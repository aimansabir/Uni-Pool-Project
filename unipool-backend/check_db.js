const prisma = require('./src/lib/prisma');

async function check() {
    const rides = await prisma.ride.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log("Rides:");
    rides.forEach(r => console.log(`ID: ${r.id}, Status: ${r.status}, Driver: ${r.driverId}, CompAt: ${r.completedAt}`));

    const bookings = await prisma.bookingRequest.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log("Bookings:");
    bookings.forEach(b => console.log(`ID: ${b.id}, Status: ${b.status}, Pass: ${b.passengerId}, Ride: ${b.rideId}`));
}
check().finally(() => prisma.$disconnect());
