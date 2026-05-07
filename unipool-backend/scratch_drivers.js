const prisma = require('./src/lib/prisma');
async function check() {
  const r1 = await prisma.ride.findUnique({ where: { id: '2698c377-ca29-445f-805a-4250c358e00f' } });
  const r2 = await prisma.ride.findUnique({ where: { id: 'fd0aac5e-9e6d-4933-9843-766e82f97c8e' } });
  console.log('Ride 1 Driver:', r1?.driverId);
  console.log('Ride 2 Driver:', r2?.driverId);
}
check().finally(() => prisma.$disconnect());
