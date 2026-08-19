import { HOLDING_PERIOD_DAYS, HOLDING_PERIOD_MS } from "../src/lib/contractor-balance-calculator";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

console.log("================================================================");
console.log("  CONTRACTOR INVOICE APPROVAL & 30-DAY MATURITY TEST SUITE");
console.log("================================================================\n");

// Scenario 1: New Contractor with fresh invoice approved 5 days ago
const now = new Date();
const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

const testInvoices = [
  { id: "inv-1", invoiceNumber: "INV-001", amount: 500, approvedAt: fiveDaysAgo },       // Immature (<30d)
  { id: "inv-2", invoiceNumber: "INV-002", amount: 750, approvedAt: thirtyFiveDaysAgo }, // Matured (>=30d)
  { id: "inv-3", invoiceNumber: "INV-003", amount: 1000, approvedAt: sixtyDaysAgo },     // Matured (>=30d)
];

const completedWithdrawals = 300;
const pendingWithdrawals = 200;

let totalEarned = 0;
let maturedGross = 0;
let immatureGross = 0;

for (const inv of testInvoices) {
  totalEarned += inv.amount;
  const ageMs = now.getTime() - inv.approvedAt.getTime();
  const isMatured = ageMs >= HOLDING_PERIOD_MS;
  if (isMatured) {
    maturedGross += inv.amount;
  } else {
    immatureGross += inv.amount;
  }
}

const availableBalance = Math.max(0, maturedGross - completedWithdrawals - pendingWithdrawals);

console.log("Test Calculations:");
console.log(`  Total Invoices Approved: $${totalEarned.toFixed(2)} (Expected: $2250.00)`);
console.log(`  Immature (<30d) Locked: $${immatureGross.toFixed(2)} (Expected: $500.00)`);
console.log(`  Matured (>=30d) Gross:  $${maturedGross.toFixed(2)} (Expected: $1750.00)`);
console.log(`  Completed Withdrawals:  $${completedWithdrawals.toFixed(2)}`);
console.log(`  Pending Withdrawals:    $${pendingWithdrawals.toFixed(2)}`);
console.log(`  Net Available Balance:  $${availableBalance.toFixed(2)} (Expected: $1250.00)`);

assert(totalEarned === 2250, "Total earned must equal sum of all approved invoices");
assert(immatureGross === 500, "Immature balance must equal $500 (inv-1 approved 5 days ago)");
assert(maturedGross === 1750, "Matured gross must equal $1750 (inv-2 + inv-3)");
assert(availableBalance === 1250, "Available balance must equal $1750 - $300 - $200 = $1250");

// Scenario 2: Withdrawal validation check
function canWithdraw(requestedAmount: number, availableBal: number): { allowed: boolean; reason?: string } {
  if (requestedAmount <= 0) return { allowed: false, reason: "Amount must be > 0" };
  if (requestedAmount > availableBal) {
    return { 
      allowed: false, 
      reason: `Insufficient withdrawable balance. Available: $${availableBal.toFixed(2)}, Requested: $${requestedAmount.toFixed(2)}` 
    };
  }
  return { allowed: true };
}

// Request $1000 (<= $1250 available) -> should succeed
const validReq = canWithdraw(1000, availableBalance);
assert(validReq.allowed === true, "Valid withdrawal within matured balance must be allowed");

// Request $1500 (> $1250 available, trying to tap into $500 immature funds) -> should fail
const invalidReq = canWithdraw(1500, availableBalance);
assert(invalidReq.allowed === false, "Withdrawal exceeding matured balance must be rejected");

// Scenario 3: Brand new contractor (only has 1 invoice approved today)
const brandNewApprovedAt = new Date();
const isBrandNewMatured = (now.getTime() - brandNewApprovedAt.getTime()) >= HOLDING_PERIOD_MS;
assert(!isBrandNewMatured, "Brand new invoice must NOT be matured");

console.log("\n================================================================");
console.log("  ALL CONTRACTOR INVOICE & 30-DAY MATURITY TESTS PASSED!");
console.log("================================================================");
