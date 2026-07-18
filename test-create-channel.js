const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const channel = await prisma.channel.create({
      data: {
        name: "WO-TEST1234",
        description: "Test description",
        type: "WORK_ORDERS",
        createdById: "cmrf41fsf000012y6tcag3gvw", // Use seed admin user
        members: {
          create: [
            { userId: "cmrf41fsf000012y6tcag3gvw", role: "ADMIN" }
          ]
        }
      }
    });
    console.log("Success:", channel);
  } catch (err) {
    console.error("Error:", err);
  }
}
test().finally(() => prisma.$disconnect());
