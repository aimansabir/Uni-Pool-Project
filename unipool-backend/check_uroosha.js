const prisma = require('./src/lib/prisma');

async function check() {
    const user = await prisma.user.findFirst({ where: { fullName: { contains: 'Uroosha', mode: 'insensitive' } } });
    console.log("User:", user?.id, user?.fullName);

    if (user) {
        const rides = await prisma.ride.findMany({ where: { driverId: user.id } });
        console.log("Rides:", rides.map(r => ({ id: r.id, status: r.status, completedAt: r.completedAt })));

        const bookings = await prisma.bookingRequest.findMany({ where: { passengerId: user.id } });
        console.log("Bookings:", bookings.map(b => ({ id: b.id, status: b.status })));
    }
}
check().finally(() => prisma.$disconnect());
