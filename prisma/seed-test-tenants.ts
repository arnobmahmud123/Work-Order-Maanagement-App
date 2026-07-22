import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Custom Test Super Admin and Tenants...");

  const passwordHash = await bcrypt.hash("password123", 8);

  // 1. Create Custom Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@platform.com" },
    update: {
      role: "SUPER_ADMIN",
      hashedPassword: passwordHash,
      isActive: true,
    },
    create: {
      name: "Custom Super Admin",
      email: "superadmin@platform.com",
      hashedPassword: passwordHash,
      role: "SUPER_ADMIN",
      company: "PropPreserve Platform Operations",
      phone: "(555) 000-9999",
      isActive: true,
    },
  });
  console.log(`✔ Created Super Admin Account: ${superAdmin.email}`);

  // 2. Create Company A (Vanguard Property Services - PROFESSIONAL Plan)
  let companyA = await prisma.company.findFirst({
    where: { name: "Vanguard Property Services" },
  });

  if (!companyA) {
    companyA = await prisma.company.create({
      data: {
        name: "Vanguard Property Services",
        branding: JSON.stringify({
          logo: null,
          primaryColor: "#06b6d4",
          secondaryColor: "#3b82f6",
          name: "Vanguard Property Services",
        }),
        theme: JSON.stringify({ mode: "dark" }),
        workOrderNumbering: JSON.stringify({ prefix: "VGD-", counter: 1001 }),
        plan: "PROFESSIONAL",
        maxUsers: 10,
        maxWorkOrders: 100,
        maxStorage: 50,
      },
    });
  }
  console.log(`✔ Created Company A: ${companyA.name}`);

  // 3. Create Admin for Company A
  const adminA = await prisma.user.upsert({
    where: { email: "admin@vanguard.com" },
    update: {
      companyId: companyA.id,
      hashedPassword: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "Vanguard Admin",
      email: "admin@vanguard.com",
      hashedPassword: passwordHash,
      role: "ADMIN",
      companyId: companyA.id,
      company: "Vanguard Property Services",
      phone: "(555) 123-4567",
      isActive: true,
    },
  });
  console.log(`✔ Created Admin for Company A: ${adminA.email}`);

  // 4. Create Company B (Guardian Restoration Group - BASIC Plan)
  let companyB = await prisma.company.findFirst({
    where: { name: "Guardian Restoration Group" },
  });

  if (!companyB) {
    companyB = await prisma.company.create({
      data: {
        name: "Guardian Restoration Group",
        branding: JSON.stringify({
          logo: null,
          primaryColor: "#10b981",
          secondaryColor: "#059669",
          name: "Guardian Restoration Group",
        }),
        theme: JSON.stringify({ mode: "light" }),
        workOrderNumbering: JSON.stringify({ prefix: "GRD-", counter: 1001 }),
        plan: "BASIC",
        maxUsers: 5,
        maxWorkOrders: 50,
        maxStorage: 20,
      },
    });
  }
  console.log(`✔ Created Company B: ${companyB.name}`);

  // 5. Create Admin for Company B
  const adminB = await prisma.user.upsert({
    where: { email: "admin@guardian.com" },
    update: {
      companyId: companyB.id,
      hashedPassword: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "Guardian Admin",
      email: "admin@guardian.com",
      hashedPassword: passwordHash,
      role: "ADMIN",
      companyId: companyB.id,
      company: "Guardian Restoration Group",
      phone: "(555) 765-4321",
      isActive: true,
    },
  });
  console.log(`✔ Created Admin for Company B: ${adminB.email}`);

  // 6. Create properties and work orders for Company A to test lists and search views
  const propA = await prisma.property.create({
    data: {
      address: "500 Oak Avenue",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      companyId: companyA.id,
    },
  });

  const woA1 = await prisma.workOrder.create({
    data: {
      title: "Grass Cut - 500 Oak Avenue",
      description: "Routine lawn mowing service and tree trimming.",
      address: propA.address,
      city: propA.city,
      state: propA.state,
      zipCode: propA.zipCode,
      serviceType: "GRASS_CUT",
      status: "ASSIGNED",
      priority: 1, // Medium
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      propertyId: propA.id,
      companyId: companyA.id,
    },
  });
  console.log(`✔ Created Property & Work Order for Company A: ${woA1.title}`);

  // 7. Create properties and work orders for Company B
  const propB = await prisma.property.create({
    data: {
      address: "1200 Pine Road",
      city: "Dayton",
      state: "OH",
      zipCode: "45402",
      companyId: companyB.id,
    },
  });

  const woB1 = await prisma.workOrder.create({
    data: {
      title: "Board Up - 1200 Pine Road",
      description: "Emergency board up of first-floor front windows due to vandalism.",
      address: propB.address,
      city: propB.city,
      state: propB.state,
      zipCode: propB.zipCode,
      serviceType: "BOARD_UP",
      status: "NEW",
      priority: 2, // High
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      propertyId: propB.id,
      companyId: companyB.id,
    },
  });
  console.log(`✔ Created Property & Work Order for Company B: ${woB1.title}`);

  console.log("\n🌱 Seeding Complete! Ready for login tests.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
