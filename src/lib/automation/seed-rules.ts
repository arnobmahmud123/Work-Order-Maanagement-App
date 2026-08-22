import { AutomationRuleDefinition } from "./types";

export const DEFAULT_URGENCY_KEYWORDS = [
  { keyword: "Urgent", targetPriority: "URGENT", category: "general" },
  { keyword: "Emergency", targetPriority: "CRITICAL", category: "hazard" },
  { keyword: "Rush", targetPriority: "URGENT", category: "deadline" },
  { keyword: "Immediate attention", targetPriority: "CRITICAL", category: "general" },
  { keyword: "Same day", targetPriority: "URGENT", category: "deadline" },
  { keyword: "ASAP", targetPriority: "URGENT", category: "deadline" },
  { keyword: "24-hour completion", targetPriority: "URGENT", category: "deadline" },
  { keyword: "Cancellation", targetPriority: "CRITICAL", category: "client" },
  { keyword: "Escalation", targetPriority: "CRITICAL", category: "client" },
  { keyword: "Overdue", targetPriority: "URGENT", category: "deadline" },
  { keyword: "Trip Hazard", targetPriority: "URGENT", category: "hazard" },
  { keyword: "Water Leak", targetPriority: "CRITICAL", category: "hazard" },
  { keyword: "Open Roof", targetPriority: "CRITICAL", category: "hazard" },
];

export const INITIAL_AUTOMATION_RULES: AutomationRuleDefinition[] = [
  // 1. New Work Order Assignment Notification
  {
    name: "New Work Order Assignment Alert",
    description: "Automatically notifies assigned contractor and processor upon new assignment.",
    trigger: "WO_ASSIGNED",
    isActive: true,
    priority: "NORMAL",
    conditions: [
      { field: "hasContractor", operator: "is_true", value: true },
    ],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["CONTRACTOR", "PROCESSOR"],
        priority: "NORMAL",
        emailSubject: "New Assignment: WO #{{work_order_number}} — {{service_type}}",
        emailBody: `Hello {{assigned_user}},\n\nYou have been assigned to Work Order #{{work_order_number}}.\n\nProperty Address: {{property_address}}\nWork Type: {{service_type}}\nDue Date: {{due_date}}\nPriority: {{priority}}\n\nPlease review the instructions, confirm receipt, and schedule the required work.\n\nLink: {{work_order_link}}\n\nBest regards,\nAutomated Workflow Engine`,
        notifTitle: "New Work Order Assigned",
        notifMessage: "You have been assigned to WO #{{work_order_number}} at {{property_address}}.",
      },
    ],
  },

  // 2. Urgent Work Order Alert with 30m Escalation
  {
    name: "Urgent Work Order Alert & Escalation",
    description: "Flags urgent orders, notifies processor, and escalates to Team Lead if unacknowledged within 30 minutes.",
    trigger: "WO_URGENT_FLAGGED",
    isActive: true,
    priority: "URGENT",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["ASSIGNED_USER", "PROCESSOR"],
        priority: "URGENT",
        actionRequired: true,
        emailSubject: "🚨 URGENT: Work Order #{{work_order_number}} Requires Immediate Attention",
        emailBody: `ATTENTION {{assigned_user}},\n\nWork Order #{{work_order_number}} has been flagged as URGENT / HIGH PRIORITY.\n\nAddress: {{property_address}}\nDue Date: {{due_date}}\nReason: {{urgency_reason}}\n\nAction Required: Acknowledge and begin processing immediately.\n\nLink: {{work_order_link}}`,
        notifTitle: "🚨 URGENT Work Order Flagged",
        notifMessage: "WO #{{work_order_number}} flagged urgent! Please acknowledge immediately.",
        escalationTiers: [
          {
            level: 1,
            delayMinutes: 30,
            targetRole: "TEAM_LEAD",
            actionType: "BOTH",
            priority: "CRITICAL",
            emailSubject: "⚠️ ESCALATION (Level 1): Urgent WO #{{work_order_number}} Not Acknowledged",
            emailBody: `Team Lead Alert,\n\nUrgent Work Order #{{work_order_number}} assigned to {{assigned_user}} has not been acknowledged after 30 minutes.\n\nProperty: {{property_address}}\nDue Date: {{due_date}}\n\nPlease intervene.\n\nLink: {{work_order_link}}`,
            notifTitle: "⚠️ Unacknowledged Urgent WO Escalation",
            notifMessage: "WO #{{work_order_number}} has not been acknowledged by {{assigned_user}} after 30m.",
          },
          {
            level: 2,
            delayMinutes: 60,
            targetRole: "MANAGER",
            actionType: "BOTH",
            priority: "CRITICAL",
            emailSubject: "🔥 ESCALATION (Level 2): Urgent WO #{{work_order_number}} Unresolved",
            emailBody: `Manager Escalation Alert,\n\nUrgent Work Order #{{work_order_number}} has remained unacknowledged for over 1 hour.\n\nAddress: {{property_address}}\n\nLink: {{work_order_link}}`,
            notifTitle: "🔥 Critical Manager Escalation",
            notifMessage: "Urgent WO #{{work_order_number}} remains untouched for >60 minutes.",
          },
        ],
      },
    ],
  },

  // 3. Field Complete but Not Submitted Reminder and Multi-Tier Escalation
  {
    name: "Field Complete Awaiting Client Submission",
    description: "Monitors Field Complete work orders and escalates at 1 hour (processor), 2 hours (team lead), and 3 hours (manager/admin).",
    trigger: "WO_FIELD_COMPLETE",
    isActive: true,
    priority: "IMPORTANT",
    conditions: [
      { field: "status", operator: "equals", value: "FIELD_COMPLETE" },
    ],
    actions: [
      {
        type: "START_ESCALATION",
        priority: "IMPORTANT",
        escalationTiers: [
          {
            level: 1,
            delayMinutes: 60, // 1 hour
            targetRole: "PROCESSOR",
            actionType: "BOTH",
            priority: "IMPORTANT",
            emailSubject: "⏰ Submission Reminder: WO #{{work_order_number}} Field Complete (1 Hour)",
            emailBody: `Hi {{assigned_user}},\n\nWork Order #{{work_order_number}} at {{property_address}} was marked Field Complete over 1 hour ago but has not yet been submitted to the client.\n\nPlease review photos/documents and submit the result to avoid client SLA penalties.\n\nLink: {{work_order_link}}`,
            notifTitle: "Field Complete Ready for Submission",
            notifMessage: "WO #{{work_order_number}} has been Field Complete for 1 hour. Ready to submit?",
          },
          {
            level: 2,
            delayMinutes: 120, // 2 hours
            targetRole: "TEAM_LEAD",
            actionType: "BOTH",
            priority: "URGENT",
            emailSubject: "⚠️ URGENT: WO #{{work_order_number}} Field Complete > 2 Hours Unsubmitted",
            emailBody: `Team Lead Notice,\n\nWork Order #{{work_order_number}} at {{property_address}} has remained unsubmitted for 2 hours following field completion.\n\nAssigned Processor: {{assigned_user}}\n\nPlease assist in submitting this order.\n\nLink: {{work_order_link}}`,
            notifTitle: "⚠️ Unsubmitted Order > 2 Hours",
            notifMessage: "WO #{{work_order_number}} unsubmitted for 2 hours. Team lead attention required.",
          },
          {
            level: 3,
            delayMinutes: 180, // 3 hours
            targetRole: "MANAGER",
            actionType: "BOTH",
            priority: "CRITICAL",
            emailSubject: "🚨 CRITICAL: WO #{{work_order_number}} Unsubmitted Field Complete > 3 Hours",
            emailBody: `Management Escalation,\n\nWork Order #{{work_order_number}} is at critical risk of cancellation or SLA breach. Field complete over 3 hours without client submission.\n\nAddress: {{property_address}}\n\nLink: {{work_order_link}}`,
            notifTitle: "🚨 SLA Breach Risk: Unsubmitted WO",
            notifMessage: "WO #{{work_order_number}} unsubmitted for 3 hours. Critical SLA risk.",
          },
        ],
      },
    ],
  },

  // 4. Client Rejection / Return Notification and Escalation
  {
    name: "Client Rejection & Return Action Required",
    description: "Alerts processor immediately upon client rejection/return with reason, escalates if not corrected.",
    trigger: "WO_REJECTED",
    isActive: true,
    priority: "CRITICAL",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["PROCESSOR", "COORDINATOR"],
        priority: "CRITICAL",
        actionRequired: true,
        emailSubject: "❌ ACTION REQUIRED: Client Rejected WO #{{work_order_number}}",
        emailBody: `Hello {{assigned_user}},\n\nThe client has REJECTED / RETURNED Work Order #{{work_order_number}}.\n\nProperty: {{property_address}}\nRejection Reason:\n"{{rejection_reason}}"\n\nRequired Action: Please review the rejection notes, collect any missing photos/documentation from the contractor, and resubmit promptly.\n\nLink: {{work_order_link}}`,
        notifTitle: "❌ Client Rejection: WO #{{work_order_number}}",
        notifMessage: "Client rejected WO #{{work_order_number}}. Reason: {{rejection_reason}}",
        escalationTiers: [
          {
            level: 1,
            delayMinutes: 120, // 2 hours
            targetRole: "TEAM_LEAD",
            actionType: "BOTH",
            priority: "CRITICAL",
            emailSubject: "⚠️ Escalation: Open Client Rejection on WO #{{work_order_number}}",
            emailBody: `Team Lead Alert,\n\nWork Order #{{work_order_number}} was rejected 2 hours ago and remains uncorrected.\n\nRejection: {{rejection_reason}}\nAssigned: {{assigned_user}}\n\nLink: {{work_order_link}}`,
            notifTitle: "⚠️ Unresolved Rejection Escalation",
            notifMessage: "Rejection on WO #{{work_order_number}} uncorrected for 2 hours.",
          },
        ],
      },
    ],
  },

  // 5. Due Soon Reminders (24h, 12h, 4h, 1h)
  {
    name: "Approaching Due Date Reminders",
    description: "Sends staged reminders as work order due dates approach.",
    trigger: "WO_DUE_SOON",
    isActive: true,
    priority: "IMPORTANT",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["CONTRACTOR", "PROCESSOR"],
        priority: "IMPORTANT",
        emailSubject: "⏰ Due Date Reminder: WO #{{work_order_number}} Due {{due_date}}",
        emailBody: `Reminder:\n\nWork Order #{{work_order_number}} at {{property_address}} is due on {{due_date}} ({{time_remaining}} remaining).\n\nCurrent Status: {{status}}\n\nPlease ensure all tasks and photos are uploaded before the cutoff.\n\nLink: {{work_order_link}}`,
        notifTitle: "Due Date Approaching",
        notifMessage: "WO #{{work_order_number}} is due in {{time_remaining}} ({{due_date}}).",
      },
    ],
  },

  // 6. Overdue Work Order Alert
  {
    name: "Overdue Work Order Alert & Admin Escalation",
    description: "Triggers immediate critical notification when a work order passes its due date without completion.",
    trigger: "WO_OVERDUE",
    isActive: true,
    priority: "CRITICAL",
    conditions: [
      { field: "isUnresolved", operator: "is_true", value: true },
    ],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["CONTRACTOR", "PROCESSOR", "TEAM_LEAD", "ADMIN"],
        priority: "CRITICAL",
        actionRequired: true,
        emailSubject: "🚨 OVERDUE: Work Order #{{work_order_number}} has passed deadline",
        emailBody: `CRITICAL ALERT:\n\nWork Order #{{work_order_number}} at {{property_address}} is now OVERDUE.\n\nDue Date was: {{due_date}}\nCurrent Status: {{status}}\nAssigned Contractor: {{contractor_name}}\n\nImmediate intervention is required.\n\nLink: {{work_order_link}}`,
        notifTitle: "🚨 Work Order OVERDUE",
        notifMessage: "WO #{{work_order_number}} is overdue! Due date was {{due_date}}.",
      },
    ],
  },

  // 7. New Client Message & Special Instructions
  {
    name: "New Client Message / Instruction Alert",
    description: "Notifies assigned team immediately when new client instructions or messages are received.",
    trigger: "CLIENT_INSTRUCTION",
    isActive: true,
    priority: "IMPORTANT",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["PROCESSOR", "COORDINATOR", "CONTRACTOR"],
        priority: "IMPORTANT",
        emailSubject: "💬 Client Update: New Instructions for WO #{{work_order_number}}",
        emailBody: `New client instructions received for Work Order #{{work_order_number}} ({{property_address}}):\n\n"{{message_content}}"\n\nPlease review and execute accordingly.\n\nLink: {{work_order_link}}`,
        notifTitle: "Client Instruction Added",
        notifMessage: "New instruction on WO #{{work_order_number}}: {{message_snippet}}",
      },
    ],
  },

  // 8. Contractor Update & Photo Upload Notification
  {
    name: "Contractor Upload & Photos Received",
    description: "Informs processor when contractor uploads job photos or marks tasks completed in the field.",
    trigger: "CONTRACTOR_PHOTOS_UPLOADED",
    isActive: true,
    priority: "NORMAL",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["PROCESSOR", "COORDINATOR"],
        priority: "NORMAL",
        emailSubject: "📷 Contractor Upload: {{file_count}} Photos on WO #{{work_order_number}}",
        emailBody: `Hi {{assigned_user}},\n\nContractor {{contractor_name}} has uploaded {{file_count}} new photos for Work Order #{{work_order_number}} ({{property_address}}).\n\nReview the photo checklist and verify quality.\n\nLink: {{work_order_link}}`,
        notifTitle: "Photos Uploaded by Contractor",
        notifMessage: "{{contractor_name}} uploaded {{file_count}} photos for WO #{{work_order_number}}.",
      },
    ],
  },

  // 9. QC Comment and Correction Reminder
  {
    name: "Quality Control Comment & Correction Notice",
    description: "Alerts contractor and processor when QC requests revisions or flags issues.",
    trigger: "QC_COMMENT",
    isActive: true,
    priority: "IMPORTANT",
    conditions: [],
    actions: [
      {
        type: "BOTH",
        targetRecipients: ["CONTRACTOR", "PROCESSOR"],
        priority: "IMPORTANT",
        actionRequired: true,
        emailSubject: "🔍 QC Review: Correction Needed on WO #{{work_order_number}}",
        emailBody: `Quality Control has reviewed Work Order #{{work_order_number}} ({{property_address}}) and added feedback:\n\nQC Comment: "{{qc_comment}}"\n\nPlease make the requested corrections promptly.\n\nLink: {{work_order_link}}`,
        notifTitle: "QC Comment Added",
        notifMessage: "QC feedback on WO #{{work_order_number}}: {{qc_comment}}",
      },
    ],
  },

  // 10. Daily Work Order Summary Digest
  {
    name: "Daily Morning Work Order Summary",
    description: "Dispatches individual summary digests at scheduled times with urgent, due today, unsubmitted, and overdue counts.",
    trigger: "DAILY_DIGEST",
    isActive: true,
    priority: "NORMAL",
    conditions: [],
    actions: [
      {
        type: "SEND_INTERNAL_EMAIL",
        targetRecipients: ["ASSIGNED_USER", "ALL_ADMINS"],
        priority: "NORMAL",
        emailSubject: "📊 Daily Work Order Summary — {{today_date}}",
        emailBody: `Good morning {{assigned_user}},\n\nHere is your daily work order portfolio overview for {{today_date}}:\n\n{{digest_summary_table}}\n\nHave a productive day!\n\nPropPreserve Operations`,
        notifTitle: "Daily Work Order Summary Ready",
        notifMessage: "Your daily work order summary for {{today_date}} is ready.",
      },
    ],
  },
];
