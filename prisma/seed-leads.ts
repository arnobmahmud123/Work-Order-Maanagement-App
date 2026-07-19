const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateMockLeads = async () => {
  console.log("Seeding mock leads...");

  const mockUsers = await prisma.user.findMany({ take: 1 });
  const adminId = mockUsers[0]?.id || "system";
  const adminName = mockUsers[0]?.name || "System Admin";

  const businessTypes = ["General Contractor", "Cleaning Company", "Roofing Contractor", "Lawn Care", "Locksmith", "HVAC Contractor", "Plumber", "Electrician"];
  const statuses = ["NEW", "CONTACTED", "VERIFIED", "CONVERTED", "REJECTED"];
  const cities = ["Dallas", "Houston", "Austin", "Atlanta", "Miami", "Orlando", "Chicago", "Phoenix", "Las Vegas", "Denver"];
  const states = ["TX", "TX", "TX", "GA", "FL", "FL", "IL", "AZ", "NV", "CO"];
  const sources = ["Google", "LinkedIn", "Facebook", "Contractor Directory", "Manual", "Referral"];

  const generatePhone = () => `+1${Math.floor(200 + Math.random() * 800)}${Math.floor(1000000 + Math.random() * 9000000)}`;

  const leadsToCreate = [];

  for (let i = 0; i < 50; i++) {
    const locIndex = Math.floor(Math.random() * cities.length);
    const bType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    
    leadsToCreate.push({
      companyName: `${bType.split(' ')[0]} Pros ${cities[locIndex]} ${i}`,
      contactName: `John Doe ${i}`,
      businessType: bType,
      address: `${1000 + i} Main St`,
      city: cities[locIndex],
      state: states[locIndex],
      zipCode: `7500${Math.floor(Math.random() * 10)}`,
      phone: generatePhone(),
      email: `contact${i}@${bType.split(' ')[0].toLowerCase()}pros.com`,
      website: `www.${bType.split(' ')[0].toLowerCase()}pros${i}.com`,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      verificationScore: Math.floor(Math.random() * 100),
    });
  }

  for (const leadData of leadsToCreate) {
    const lead = await prisma.lead.create({ data: leadData });
    
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "STATUS_CHANGE",
        content: `Lead automatically discovered from ${lead.source}`,
        authorId: adminId,
        authorName: "Discovery Bot"
      }
    });

    if (lead.status !== "NEW") {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "STATUS_CHANGE",
          content: `Status moved to ${lead.status}`,
          authorId: adminId,
          authorName: adminName
        }
      });
    }

    if (Math.random() > 0.5) {
      const note = await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content: "Looks like a great fit. Left a voicemail this morning.",
          authorId: adminId,
          authorName: adminName
        }
      });
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "NOTE_ADDED",
          content: "Added a new note",
          authorId: adminId,
          authorName: adminName
        }
      });
    }

    if (Math.random() > 0.5) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          tags: {
            connectOrCreate: [
              {
                where: { name: "High Priority" },
                create: { name: "High Priority", color: "red" }
              },
            ]
          }
        }
      })
    }
  }

  console.log("Successfully seeded mock leads!");
};

generateMockLeads()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
