const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const localPrisma = new PrismaClient();

async function syncToD1() {
  console.log("Reading data from local Prisma dev.db SQLite database...");
  
  const companies = await localPrisma.company.findMany();
  const users = await localPrisma.user.findMany();
  const properties = await localPrisma.property.findMany();
  const workOrders = await localPrisma.workOrder.findMany();

  let sql = "PRAGMA foreign_keys = OFF;\n\n";

  // Clear existing test data first to avoid primary key/unique constraint conflicts
  // Note: D1 database matches the model names exactly (or @@map values)
  sql += "DELETE FROM \"MessageReaction\";\n";
  sql += "DELETE FROM \"ChatMessage\";\n";
  sql += "DELETE FROM \"ChannelMember\";\n";
  sql += "DELETE FROM \"Channel\";\n";
  sql += "DELETE FROM \"ActivityLog\";\n";
  sql += "DELETE FROM \"work_order_files\";\n";
  sql += "DELETE FROM \"Invoice\";\n";
  sql += "DELETE FROM \"SupportTicket\";\n";
  sql += "DELETE FROM \"WorkOrder\";\n";
  sql += "DELETE FROM \"Property\";\n";
  sql += "DELETE FROM \"users\";\n";
  sql += "DELETE FROM \"companies\";\n\n";

  // Helper to escape SQL values
  const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'number') return val;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  console.log(`Extracted ${companies.length} companies, ${users.length} users, ${properties.length} properties, ${workOrders.length} work orders`);

  // Insert Company
  for (const c of companies) {
    sql += `INSERT INTO "companies" ("id", "name", "logo", "branding", "theme", "colors", "timezone", "currency", "dateFormat", "phone", "address", "email", "taxSettings", "invoiceSettings", "notificationSettings", "emailTemplates", "smsTemplates", "workOrderNumbering", "vendorNumbering", "clientNumbering", "isActive", "plan", "maxUsers", "maxVendors", "maxWorkOrders", "maxStorage", "apiAccess", "crmAccess", "automationAccess", "aiAccess", "created_at", "updated_at", "twilioPhone", "twilioSid", "twilioToken", "elevenlabsAgentId", "elevenlabsPhoneId") VALUES (${esc(c.id)}, ${esc(c.name)}, ${esc(c.logo)}, ${esc(c.branding)}, ${esc(c.theme)}, ${esc(c.colors)}, ${esc(c.timezone)}, ${esc(c.currency)}, ${esc(c.dateFormat)}, ${esc(c.phone)}, ${esc(c.address)}, ${esc(c.email)}, ${esc(c.taxSettings)}, ${esc(c.invoiceSettings)}, ${esc(c.notificationSettings)}, ${esc(c.emailTemplates)}, ${esc(c.smsTemplates)}, ${esc(c.workOrderNumbering)}, ${esc(c.vendorNumbering)}, ${esc(c.clientNumbering)}, ${esc(c.isActive)}, ${esc(c.plan)}, ${esc(c.maxUsers)}, ${esc(c.maxVendors)}, ${esc(c.maxWorkOrders)}, ${esc(c.maxStorage)}, ${esc(c.apiAccess)}, ${esc(c.crmAccess)}, ${esc(c.automationAccess)}, ${esc(c.aiAccess)}, ${esc(c.createdAt)}, ${esc(c.updatedAt)}, ${esc(c.twilioPhone)}, ${esc(c.twilioSid)}, ${esc(c.twilioToken)}, ${esc(c.elevenlabsAgentId)}, ${esc(c.elevenlabsPhoneId)});\n`;
  }

  // Insert users
  for (const u of users) {
    sql += `INSERT INTO "users" ("id", "name", "email", "emailVerified", "hashedPassword", "image", "role", "phone", "company", "isActive", "createdAt", "updatedAt", "company_id") VALUES (${esc(u.id)}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.emailVerified)}, ${esc(u.hashedPassword)}, ${esc(u.image)}, ${esc(u.role)}, ${esc(u.phone)}, ${esc(u.company)}, ${esc(u.isActive)}, ${esc(u.createdAt)}, ${esc(u.updatedAt)}, ${esc(u.companyId)});\n`;
  }

  // Insert Property
  for (const p of properties) {
    sql += `INSERT INTO "Property" ("id", "address", "city", "state", "zipCode", "latitude", "longitude", "imageUrl", "metadata", "createdAt", "updatedAt", "company_id") VALUES (${esc(p.id)}, ${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)}, ${esc(p.zipCode)}, ${esc(p.latitude)}, ${esc(p.longitude)}, ${esc(p.imageUrl)}, ${esc(p.metadata)}, ${esc(p.createdAt)}, ${esc(p.updatedAt)}, ${esc(p.companyId)});\n`;
  }

  // Insert WorkOrder
  for (const wo of workOrders) {
    sql += `INSERT INTO "WorkOrder" ("id", "title", "description", "address", "city", "state", "zipCode", "latitude", "longitude", "serviceType", "status", "priority", "dueDate", "completedAt", "lockCode", "lockboxLocation", "gateCode", "keyCode", "keycodeLocation", "lotSize", "lawnSize", "specialInstructions", "tasks", "metadata", "contractorId", "coordinatorId", "processorId", "createdById", "propertyId", "createdAt", "updatedAt", "company_id") VALUES (${esc(wo.id)}, ${esc(wo.title)}, ${esc(wo.description)}, ${esc(wo.address)}, ${esc(wo.city)}, ${esc(wo.state)}, ${esc(wo.zipCode)}, ${esc(wo.latitude)}, ${esc(wo.longitude)}, ${esc(wo.serviceType)}, ${esc(wo.status)}, ${esc(wo.priority)}, ${esc(wo.dueDate)}, ${esc(wo.completedAt)}, ${esc(wo.lockCode)}, ${esc(wo.lockboxLocation)}, ${esc(wo.gateCode)}, ${esc(wo.keyCode)}, ${esc(wo.keycodeLocation)}, ${esc(wo.lotSize)}, ${esc(wo.lawnSize)}, ${esc(wo.specialInstructions)}, ${esc(wo.tasks)}, ${esc(wo.metadata)}, ${esc(wo.contractorId)}, ${esc(wo.coordinatorId)}, ${esc(wo.processorId)}, ${esc(wo.createdById)}, ${esc(wo.propertyId)}, ${esc(wo.createdAt)}, ${esc(wo.updatedAt)}, ${esc(wo.companyId)});\n`;
  }

  sql += "\nPRAGMA foreign_keys = ON;\n";

  const sqlFilePath = path.join(__dirname, 'seed_custom.sql');
  fs.writeFileSync(sqlFilePath, sql, 'utf8');
  console.log(`Generated seed SQL script at: ${sqlFilePath}`);

  // 1. Sync local wrangler D1 database
  try {
    console.log("Syncing to wrangler local D1 storage...");
    const outLocal = execSync(`npx wrangler d1 execute proppreserve --local --file=${sqlFilePath}`, { encoding: 'utf8' });
    console.log("Wrangler Local sync output:\n", outLocal);
  } catch (err) {
    console.error("Wrangler Local sync failed:", err.message);
  }

  console.log("\nSync complete! Your local dev server login credentials are now updated.");
}

syncToD1()
  .catch(err => console.error(err))
  .finally(async () => {
    await localPrisma.$disconnect();
  });
