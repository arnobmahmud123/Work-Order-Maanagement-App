ALTER TABLE "companies" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "companies" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "companies" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "companies" ADD COLUMN "smtpPass" TEXT;
ALTER TABLE "companies" ADD COLUMN "smtpFrom" TEXT;

CREATE TABLE IF NOT EXISTS "FinancialTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FinancialTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FinancialTransaction_companyId_idx" ON "FinancialTransaction"("companyId");
