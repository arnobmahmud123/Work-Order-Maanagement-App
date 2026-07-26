const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedFinancials() {
  console.log("Seeding financial data...");

  // Get a company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found.");
    return;
  }
  
  const companyId = company.id;

  // Clear old test data
  await prisma.financialTransaction.deleteMany({
    where: { companyId }
  });

  const generateData = () => {
    const transactions = [];
    const currentYear = new Date().getFullYear();
    
    for (let month = 0; month < 12; month++) {
      // Income 
      const income = Math.floor(Math.random() * 20000) + 10000; // 10k - 30k
      transactions.push({
        companyId,
        type: "INCOME",
        category: "REVENUE",
        amount: income,
        date: new Date(currentYear, month, Math.floor(Math.random() * 28) + 1),
        description: `Monthly Work Order Revenue - ${month + 1}/${currentYear}`
      });

      // Expenses
      const materials = Math.floor(income * 0.15); // ~15%
      const contractor = Math.floor(income * 0.40); // ~40%
      const insurance = 500; 
      const staff = 2500;
      const sub = 199;

      transactions.push({ companyId, type: "EXPENSE", category: "MATERIALS", amount: materials, date: new Date(currentYear, month, 5), description: "Supplies & Materials" });
      transactions.push({ companyId, type: "EXPENSE", category: "CONTRACTOR_PAYMENT", amount: contractor, date: new Date(currentYear, month, 15), description: "Contractor Payouts" });
      transactions.push({ companyId, type: "EXPENSE", category: "INSURANCE", amount: insurance, date: new Date(currentYear, month, 1), description: "Monthly General Liability" });
      transactions.push({ companyId, type: "EXPENSE", category: "STAFF_PAYMENT", amount: staff, date: new Date(currentYear, month, 25), description: "Internal Staff Payroll" });
      transactions.push({ companyId, type: "EXPENSE", category: "SUBSCRIPTION", amount: sub, date: new Date(currentYear, month, 3), description: "Software Subscriptions" });
    }
    
    return transactions;
  };

  const data = generateData();
  
  let count = 0;
  for (const t of data) {
    await prisma.financialTransaction.create({ data: t });
    count++;
  }

  console.log(`Seeded ${count} financial transactions for company ${companyId}`);
}

seedFinancials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
