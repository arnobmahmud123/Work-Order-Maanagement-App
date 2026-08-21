import prisma from "@/lib/prisma";

const DEFAULT_ACCOUNTS = [
  {
    name: "Accounts Receivable (A/R)",
    type: "Asset",
    subType: "AccountsReceivable",
    description: "Unpaid client invoices",
  },
  {
    name: "Accounts Payable (A/P)",
    type: "Liability",
    subType: "AccountsPayable",
    description: "Unpaid contractor & vendor bills",
  },
  {
    name: "Services Revenue",
    type: "Revenue",
    subType: "ServiceFeeIncome",
    description: "Income from property preservation services",
  },
  {
    name: "Subcontractor Expense",
    type: "Expense",
    subType: "CostOfLabor",
    description: "Direct labor costs paid to network contractors",
  },
  {
    name: "Materials Expense",
    type: "Expense",
    subType: "SuppliesMaterials",
    description: "Costs of materials purchased for jobs",
  },
  {
    name: "Chargeback Revenue",
    type: "Revenue",
    subType: "OtherPrimaryIncome",
    description: "Income or contra-expense generated from contractor penalties",
  }
];

export async function seedChartOfAccounts(companyId: string) {
  console.log(`[Seed] Seeding Chart of Accounts for company ${companyId}...`);
  
  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await prisma.chartOfAccount.findFirst({
      where: {
        companyId,
        name: account.name
      }
    });

    if (!existing) {
      await prisma.chartOfAccount.create({
        data: {
          ...account,
          companyId,
          // Generating a mock QBO ID for scaffold purposes
          qboId: `QBO-COA-${Math.floor(Math.random() * 100000)}`
        }
      });
      console.log(`[Seed] Created account: ${account.name}`);
    } else {
      console.log(`[Seed] Account already exists: ${account.name}`);
    }
  }
}
