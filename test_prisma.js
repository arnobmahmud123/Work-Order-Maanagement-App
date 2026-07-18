const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const posts = await prisma.post.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: 0,
        take: 20,
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true, role: true, company: true },
          },
          workOrder: {
            select: { id: true, title: true, address: true, status: true, dueDate: true, serviceType: true },
          },
          _count: {
            select: { comments: true, reactions: true },
          },
          reactions: {
            where: { userId: "mock" },
            select: { type: true },
          },
          attachments: {
            select: { id: true, filename: true, originalName: true, mimeType: true, url: true, thumbnailUrl: true },
          },
          jobRequest: {
            select: { id: true, status: true, urgency: true, budget: true, deadline: true, location: true },
          },
        },
      });
      console.log("Success! Found", posts.length);
  } catch (err) {
      console.error("Prisma error:", err);
  } finally {
      await prisma.$disconnect();
  }
}

main();
