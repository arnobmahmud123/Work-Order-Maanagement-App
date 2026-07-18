const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const channel = await prisma.channel.findFirst({ where: { type: 'WORK_ORDERS' } });
  console.log('Channel:', channel);
}
test().catch(console.error).finally(() => prisma.$disconnect());
