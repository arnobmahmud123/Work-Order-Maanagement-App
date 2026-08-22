import prisma from "@/lib/prisma";
import { DEFAULT_URGENCY_KEYWORDS } from "./seed-rules";
import { NotificationPriority } from "./types";

export interface UrgencyScanResult {
  isUrgent: boolean;
  targetPriority: NotificationPriority;
  matchedKeywords: string[];
  reason: string;
}

/**
 * Automatically evaluates urgency based on keywords in text,
 * due date proximity, and explicit priority flags.
 */
export async function detectUrgency(
  textToScan: string = "",
  workOrder?: any,
  companyId?: string
): Promise<UrgencyScanResult> {
  const matchedKeywords: string[] = [];
  let highestPriority: NotificationPriority = "NORMAL";
  let reasonParts: string[] = [];

  // 1. Fetch active keywords from DB, with fallback
  let keywordsList: { keyword: string; targetPriority: string }[] = [];
  try {
    const dbKeywords = await prisma.urgencyKeyword.findMany({
      where: {
        isActive: true,
        ...(companyId ? { companyId } : {}),
      },
    });
    if (dbKeywords.length > 0) {
      keywordsList = dbKeywords;
    } else {
      keywordsList = DEFAULT_URGENCY_KEYWORDS;
    }
  } catch {
    keywordsList = DEFAULT_URGENCY_KEYWORDS;
  }

  // 2. Scan text for keyword matches
  const normalizedText = textToScan.toLowerCase();
  for (const item of keywordsList) {
    const kw = item.keyword.toLowerCase();
    if (normalizedText.includes(kw)) {
      matchedKeywords.push(item.keyword);
      const prio = item.targetPriority as NotificationPriority;
      if (prio === "CRITICAL") {
        highestPriority = "CRITICAL";
      } else if (prio === "URGENT" && highestPriority !== "CRITICAL") {
        highestPriority = "URGENT";
      } else if (prio === "IMPORTANT" && highestPriority === "NORMAL") {
        highestPriority = "IMPORTANT";
      }
    }
  }

  if (matchedKeywords.length > 0) {
    reasonParts.push(`Matched keywords: [${matchedKeywords.join(", ")}]`);
  }

  // 3. Evaluate work order fields if provided
  if (workOrder) {
    // Check priority value (e.g. priority >= 2 or explicit HIGH/URGENT)
    if (workOrder.priority >= 2 || workOrder.priority === "URGENT" || workOrder.priority === "HIGH") {
      if (highestPriority !== "CRITICAL") highestPriority = "URGENT";
      reasonParts.push("Flagged high/urgent priority");
    }

    // Check emergency service type
    const sType = (workOrder.serviceType || "").toUpperCase();
    if (sType.includes("EMERGENCY") || sType.includes("BOARD_UP") || sType.includes("HAZARD")) {
      if (highestPriority === "NORMAL") highestPriority = "IMPORTANT";
      reasonParts.push(`Emergency/Hazard Service Type (${workOrder.serviceType})`);
    }

    // Check Due Date
    if (workOrder.dueDate) {
      const now = new Date();
      const due = new Date(workOrder.dueDate);
      const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        highestPriority = "CRITICAL";
        reasonParts.push(`Overdue by ${Math.abs(Math.round(diffHours))} hours`);
      } else if (diffHours <= 4) {
        highestPriority = "CRITICAL";
        reasonParts.push(`Due in ${Math.round(diffHours)} hours (< 4 hours)`);
      } else if (diffHours <= 24) {
        if (highestPriority !== "CRITICAL") highestPriority = "URGENT";
        reasonParts.push(`Due within 24 hours (${Math.round(diffHours)}h remaining)`);
      }
    }
  }

  const isUrgent = highestPriority === "URGENT" || highestPriority === "CRITICAL";

  return {
    isUrgent,
    targetPriority: highestPriority,
    matchedKeywords,
    reason: reasonParts.join(" • ") || "Normal Priority",
  };
}
