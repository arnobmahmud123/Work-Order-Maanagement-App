const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const userId = "cmrf41fsf000012y6tcag3gvw";
  const channels = await prisma.channel.findMany({
    where: {
      isArchived: false,
      OR: [
        { type: { in: ["GENERAL", "WORK_ORDERS"] } },
        { members: { some: { userId } } },
      ],
    },
    include: { _count: { select: { messages: true, members: true } } }
  });
  console.log("Channels found:", channels.length);
  const woChannels = channels.filter(c => c.type === "WORK_ORDERS");
  console.log("WORK_ORDERS channels:", woChannels.length);
}
test().finally(() => prisma.$disconnect());
