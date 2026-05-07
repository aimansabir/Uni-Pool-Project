const prisma = require('./src/lib/prisma');
async function check() {
  const u = await prisma.user.findFirst({ where: { ibaEmail: 'm.khizer.28991@khi.iba.edu.pk' } });
  console.log('Khizer ID:', u?.id);
}
check().finally(() => prisma.$disconnect());
