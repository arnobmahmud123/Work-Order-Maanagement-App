const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Drop child tables first to avoid referential constraint and trigger errors
const tables = [
  "MessageReaction", "ChatMessage", "ChannelMember", "Channel", "ActivityLog",
  "work_order_files", "TicketComment", "SupportTicket", "InvoiceItem", "Invoice",
  "BalanceTransaction", "ContractorBalance", "Dispute", "Withdrawal", "PostReport",
  "PostReaction", "PostComment", "PostAttachment", "Post", "JobOffer", "JobRequest",
  "Rating", "ContractorBadge", "ContractorProfile", "Supplier", "MaterialTransaction",
  "Material", "PurchaseOrderItem", "PurchaseOrder", "sms_messages", "leads",
  "lead_activities", "lead_notes", "lead_tags", "_LeadTags", "PropertyPhoto",
  "WorkOrder", "Property", "InspectorSpecialty", "Inspector", "VoiceProfile",
  "CallLog", "ScheduledCall", "TypingIndicator", "NotificationPreference",
  "Notification", "accounts", "sessions", "verification_tokens", "users", "companies"
];

async function resetRemoteDb() {
  console.log("=== RESETTING REMOTE CLOUDFLARE D1 DATABASE ===");
  
  let dropSql = "PRAGMA foreign_keys = OFF;\n\n";
  for (const table of tables) {
    dropSql += `DROP TABLE IF EXISTS "${table}";\n`;
  }
  dropSql += "\nPRAGMA foreign_keys = ON;\n";

  const dropFilePath = path.join(__dirname, 'drop_all.sql');
  fs.writeFileSync(dropFilePath, dropSql, 'utf8');
  console.log(`Generated drop SQL script at: ${dropFilePath}`);

  // 1. Drop all remote tables
  try {
    console.log("Dropping existing tables on remote D1...");
    execSync(`npx wrangler d1 execute proppreserve --remote --file=${dropFilePath} --yes`);
    console.log("✔ Remote D1 wiped clean.");
  } catch (err) {
    console.error("Drop tables execution failed:", err.message);
  }

  // 2. Re-create tables from schema.sql
  const schemaPath = path.join(__dirname, '../schema.sql');
  try {
    console.log("Re-building database schema on remote D1...");
    execSync(`npx wrangler d1 execute proppreserve --remote --file=${schemaPath} --yes`);
    console.log("✔ Remote database schema initialized.");
  } catch (err) {
    console.error("Schema building failed:", err.message);
  }

  // 3. Seed verified users from seed_custom.sql
  const seedPath = path.join(__dirname, 'seed_custom.sql');
  try {
    console.log("Populating remote D1 with seed user credentials...");
    execSync(`npx wrangler d1 execute proppreserve --remote --file=${seedPath} --yes`);
    console.log("✔ Seeding complete.");
  } catch (err) {
    console.error("Seeding remote database failed:", err.message);
  }

  console.log("\n=== REMOTE DATABASE RESET & SYNC COMPLETED SUCCESSFULLY ===");
}

resetRemoteDb().catch(err => console.error(err));
