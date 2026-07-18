const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const userId = "cmrf41fsf000012y6tcag3gvw";
  const channel = await prisma.channel.create({
    data: {
      name: "WO-TEST999",
      description: "Test description cmrf41fsf000012y6tcaGXYZ",
      type: "WORK_ORDERS",
      createdById: userId,
      members: { create: [{ userId, role: "ADMIN" }] }
    }
  });
  console.log("Created:", channel.id);
  
  const channels = await prisma.channel.findMany({
    where: {
      isArchived: false,
      OR: [
        { type: { in: ["GENERAL", "WORK_ORDERS"] } },
        { members: { some: { userId } } },
      ],
    }
  });
  const found = channels.find(c => c.id === channel.id);
  console.log("Found in GET:", !!found);
}
test().catch(console.error).finally(() => prisma.$disconnect());
