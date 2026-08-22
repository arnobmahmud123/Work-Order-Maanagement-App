export type AutomationTrigger =
  | "WO_CREATED"
  | "WO_ASSIGNED"
  | "WO_REASSIGNED"
  | "WO_STATUS_CHANGED"
  | "WO_URGENT_FLAGGED"
  | "WO_PRIORITY_CHANGED"
  | "WO_DUE_DATE_CHANGED"
  | "WO_DUE_SOON"
  | "WO_OVERDUE"
  | "WO_FIELD_COMPLETE"
  | "WO_RESULT_SUBMITTED"
  | "WO_RETURNED"
  | "WO_REJECTED"
  | "WO_CANCELLED"
  | "WO_CLOSED"
  | "CLIENT_MESSAGE"
  | "INTERNAL_MESSAGE"
  | "CLIENT_INSTRUCTION"
  | "CLIENT_ESCALATION"
  | "CONTRACTOR_UPDATE"
  | "CONTRACTOR_PHOTOS_UPLOADED"
  | "CONTRACTOR_WORK_COMPLETE"
  | "CONTRACTOR_BID_SUBMITTED"
  | "QC_REVIEW_REQUIRED"
  | "QC_COMMENT"
  | "QC_REJECTED"
  | "QC_APPROVED"
  | "DAILY_DIGEST";

export type NotificationPriority = "NORMAL" | "IMPORTANT" | "URGENT" | "CRITICAL";

export interface AutomationCondition {
  field:
    | "status"
    | "priority"
    | "client"
    | "serviceType"
    | "unsubmittedHours"
    | "overdueHours"
    | "hoursBeforeDue"
    | "hasPhotos"
    | "hasContractor"
    | "keywordMatch"
    | "isUnresolved"
    | "customField";
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "in"
    | "greater_than"
    | "less_than"
    | "is_true"
    | "is_false"
    | "matches_keyword";
  value: any;
}

export interface EscalationTier {
  level: number;
  delayMinutes: number; // minutes from initial trigger or previous tier
  targetRole: "ASSIGNED_USER" | "PROCESSOR" | "COORDINATOR" | "CONTRACTOR" | "TEAM_LEAD" | "MANAGER" | "ADMIN" | "CUSTOM_EMAIL";
  customRecipient?: string;
  actionType: "SEND_INTERNAL_EMAIL" | "CREATE_IN_APP_NOTIF" | "BOTH";
  emailSubjectTemplate?: string;
  emailSubject?: string;
  emailBodyTemplate?: string;
  emailBody?: string;
  notifTitleTemplate?: string;
  notifTitle?: string;
  notifMessageTemplate?: string;
  notifMessage?: string;
  priority: NotificationPriority;
}

export interface AutomationAction {
  type:
    | "SEND_INTERNAL_EMAIL"
    | "CREATE_IN_APP_NOTIF"
    | "BOTH"
    | "CHANGE_PRIORITY"
    | "CHANGE_STATUS"
    | "REASSIGN_USER"
    | "START_ESCALATION"
    | "WAIT_DELAY";
  targetRecipients?: (
    | "ASSIGNED_USER"
    | "PROCESSOR"
    | "COORDINATOR"
    | "CONTRACTOR"
    | "TEAM_LEAD"
    | "MANAGER"
    | "ADMIN"
    | "ALL_ADMINS"
    | "CREATOR"
  )[];
  customEmails?: string[];
  priority?: NotificationPriority;
  emailSubject?: string;
  emailBody?: string;
  notifTitle?: string;
  notifMessage?: string;
  actionRequired?: boolean;
  newPriority?: number;
  newStatus?: string;
  delayMinutes?: number;
  escalationTiers?: EscalationTier[];
}

export interface AutomationRuleDefinition {
  id?: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  isActive: boolean;
  priority: NotificationPriority;
  delayMinutes?: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  escalationChain?: EscalationTier[];
  clientSpecific?: string;
  serviceTypeSpecific?: string;
  companyId?: string;
  createdById?: string;
}

export interface TriggerContext {
  workOrder?: any;
  user?: any;
  previousState?: any;
  message?: any;
  comment?: any;
  fileCount?: number;
  rejectionReason?: string;
  keywordMatched?: string;
  hoursElapsed?: number;
  meta?: Record<string, any>;
}
