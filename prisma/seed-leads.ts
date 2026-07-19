const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateMockLeads = async () => {
  console.log("Seeding mock leads for AI Lead Finder...");

  // clear existing leads first to avoid duplicates
  await prisma.leadActivity.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.lead.deleteMany({});

  const mockUsers = await prisma.user.findMany({ take: 1 });
  const adminId = mockUsers[0]?.id || "system";
  const adminName = mockUsers[0]?.name || "System Admin";

  const businessTypes = ["Property Preservation", "General Contractor", "Inspection Company", "Lawn Care", "Locksmith"];
  const cities = ["Dallas", "Houston", "Austin", "Atlanta", "Miami"];
  const states = ["TX", "TX", "TX", "GA", "FL"];
  
  const roles = ["Lead Preservation Contractor", "Foreclosure Field Supervisor", "Debris Removal Coordinator", "Winterization Specialist", "Owner/Operator"];

  const generatePhone = () => `+1 (${Math.floor(200 + Math.random() * 800)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`;

  const leadsToCreate = [];

  // Generate some specifically formatted to match the screenshot
  leadsToCreate.push({
    companyName: "US Guard Property Preservation",
    contactName: "Linda Brown",
    contactRole: "Lead Preservation Contractor",
    businessType: "Property Preservation",
    address: "123 Main St",
    city: "Texas",
    state: "",
    zipCode: "75001",
    phone: "+1 (200) 555-0110",
    email: "linda.brown@usguardpropertypreservation.com",
    emailVerified: true,
    website: "usguardpropertypreservation.com",
    source: "Google Maps & Business Directories",
    status: "NEW",
    verificationScore: 96,
    dealValue: 24763,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com"
  });

  leadsToCreate.push({
    companyName: "Apex Preservation Services",
    contactName: "David Anderson",
    contactRole: "Foreclosure Field Supervisor",
    businessType: "Property Preservation",
    address: "456 Oak St",
    city: "Texas",
    state: "",
    zipCode: "75002",
    phone: "+1 (217) 555-0113",
    email: "david.anderson@apexpreservationservices.com",
    emailVerified: true,
    website: "apexpreservationservices.com",
    source: "Google Maps & Business Directories",
    status: "NEW",
    verificationScore: 98,
    dealValue: 33785,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com"
  });

  leadsToCreate.push({
    companyName: "Nationwide Property Care LLC",
    contactName: "Susan Sanchez",
    contactRole: "Debris Removal Coordinator",
    businessType: "Property Preservation",
    address: "789 Pine St",
    city: "Texas",
    state: "",
    zipCode: "75003",
    phone: "+1 (469) 555-0199",
    email: "susan.sanchez@nationwidepropertycare.com",
    emailVerified: true,
    website: "nationwidepropertycare.com",
    source: "Google Maps & Business Directories",
    status: "NEW",
    verificationScore: 97,
    dealValue: 35200,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com"
  });

  leadsToCreate.push({
    companyName: "Gold Standard Winterization & Boarding",
    contactName: "Thomas Torres",
    contactRole: "Winterization Specialist",
    businessType: "Property Preservation",
    address: "101 Elm St",
    city: "Texas",
    state: "",
    zipCode: "75004",
    phone: "+1 (817) 555-0245",
    email: "thomas.torres@goldstandardwinterization.com",
    emailVerified: true,
    website: "goldstandardwinterization.com",
    source: "Google Maps & Business Directories",
    status: "NEW",
    verificationScore: 95,
    dealValue: 22450,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com"
  });

  // Generate the rest randomly
  for (let i = 0; i < 46; i++) {
    const locIndex = Math.floor(Math.random() * cities.length);
    const bType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    
    leadsToCreate.push({
      companyName: `${bType.split(' ')[0]} Pros ${cities[locIndex]} ${i}`,
      contactName: `John Doe ${i}`,
      contactRole: role,
      businessType: bType,
      address: `${1000 + i} Main St`,
      city: cities[locIndex],
      state: states[locIndex],
      zipCode: `7500${Math.floor(Math.random() * 10)}`,
      phone: generatePhone(),
      email: `contact${i}@${bType.split(' ')[0].toLowerCase()}pros.com`,
      emailVerified: true,
      website: `www.${bType.split(' ')[0].toLowerCase()}pros${i}.com`,
      source: "Google Maps & Business Directories",
      status: "NEW",
      verificationScore: 90 + Math.floor(Math.random() * 10),
      dealValue: 15000 + Math.floor(Math.random() * 80000),
      linkedinUrl: "https://linkedin.com",
      twitterUrl: "https://twitter.com",
      facebookUrl: "https://facebook.com",
      instagramUrl: "https://instagram.com"
    });
  }

  for (const leadData of leadsToCreate) {
    await prisma.lead.create({ data: leadData });
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
