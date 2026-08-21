-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "qboId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "company_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChartOfAccount_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billNumber" TEXT NOT NULL,
    "vendorName" TEXT,
    "vendorId" TEXT,
    "workOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "qboId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "company_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "billId" TEXT NOT NULL,
    CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractorId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "clientInvoiceId" TEXT,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "appliedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "qboJournalId" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chargeback_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Chargeback_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Chargeback_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CLIENT',
    "workOrderId" TEXT,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "noCharge" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "approvedAt" DATETIME,
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "qboId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "company_id" TEXT,
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("approvedAt", "clientId", "company_id", "createdAt", "dueDate", "id", "invoiceNumber", "noCharge", "notes", "paidAt", "status", "stripeInvoiceId", "stripePaymentId", "subtotal", "tax", "total", "type", "updatedAt", "workOrderId") SELECT "approvedAt", "clientId", "company_id", "createdAt", "dueDate", "id", "invoiceNumber", "noCharge", "notes", "paidAt", "status", "stripeInvoiceId", "stripePaymentId", "subtotal", "tax", "total", "type", "updatedAt", "workOrderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_workOrderId_idx" ON "Invoice"("workOrderId");
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX "Invoice_company_id_idx" ON "Invoice"("company_id");
CREATE TABLE "new_financial_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceId" TEXT,
    "workOrderId" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "financial_transactions_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_financial_transactions" ("amount", "category", "company_id", "created_at", "date", "description", "id", "referenceId", "type", "updated_at") SELECT "amount", "category", "company_id", "created_at", "date", "description", "id", "referenceId", "type", "updated_at" FROM "financial_transactions";
DROP TABLE "financial_transactions";
ALTER TABLE "new_financial_transactions" RENAME TO "financial_transactions";
CREATE INDEX "financial_transactions_company_id_idx" ON "financial_transactions"("company_id");
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");
CREATE INDEX "financial_transactions_category_idx" ON "financial_transactions"("category");
CREATE INDEX "financial_transactions_date_idx" ON "financial_transactions"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ChartOfAccount_company_id_idx" ON "ChartOfAccount"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");

-- CreateIndex
CREATE INDEX "Bill_company_id_idx" ON "Bill"("company_id");

-- CreateIndex
CREATE INDEX "Bill_vendorId_idx" ON "Bill"("vendorId");

-- CreateIndex
CREATE INDEX "Bill_workOrderId_idx" ON "Bill"("workOrderId");

-- CreateIndex
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");

-- CreateIndex
CREATE INDEX "Chargeback_company_id_idx" ON "Chargeback"("company_id");

-- CreateIndex
CREATE INDEX "Chargeback_contractorId_idx" ON "Chargeback"("contractorId");

-- CreateIndex
CREATE INDEX "Chargeback_workOrderId_idx" ON "Chargeback"("workOrderId");

