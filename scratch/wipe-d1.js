import { execSync } from "child_process";

const tables = [
  "PostReaction", "JobOffer", "JobRequest", "ContractorBadge", "ContractorProfile", "Rating", "PostReport",
  "PostComment", "MaterialTransaction", "InspectorSpecialty", "ChannelMember", "Material", "PurchaseOrderItem",
  "PurchaseOrder", "MessageReaction", "TypingIndicator", "ContractorBalance", "BalanceTransaction",
  "Dispute", "Withdrawal", "PostAttachment", "Post", "accounts", "sessions", "verification_tokens",
  "work_order_files", "users", "Account", "Session", "VerificationToken", "User", "WorkOrder", "Property",
  "PropertyPhoto", "FileUpload", "Thread", "ThreadParticipant", "Message", "MessageReadReceipt",
  "MessageAttachment", "InvoiceItem", "Invoice", "SupportTicket", "TicketComment", "Notification",
  "ActivityLog", "NotificationPreference", "Inspector", "CallLog", "ScheduledCall", "Channel",
  "ChatMessage", "VoiceProfile", "Supplier"
];

console.log(`Wiping all ${tables.length} tables from D1 database one by one...`);

for (const t of tables) {
  try {
    execSync(
      `npx wrangler d1 execute proppreserve --remote --command='PRAGMA foreign_keys = OFF; DROP TABLE IF EXISTS "${t}";' --yes`,
      { stdio: "ignore" }
    );
    console.log(`  Dropped table: ${t}`);
  } catch (err) {
    console.log(`  Failed to drop table ${t} (might not exist)`);
  }
}

console.log("Database wipe completed!");
