export interface PlanConfig {
  id: string;
  name: string;
  maxUsers: number;
  maxWorkOrders: number;
  maxVendors: number;
  maxStorageGB: number;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
  TRIAL: {
    id: "TRIAL",
    name: "Trial",
    maxUsers: 5,
    maxWorkOrders: 50,
    maxVendors: 10,
    maxStorageGB: 5,
    price: "$0",
    period: "/14 days",
    description: "Free 14-day full feature trial",
    features: ["Up to 5 users", "50 work orders", "GPS photo timestamps", "Basic invoicing"],
  },
  BASIC: {
    id: "BASIC",
    name: "Starter",
    maxUsers: 5,
    maxWorkOrders: 50,
    maxVendors: 10,
    maxStorageGB: 10,
    price: "$49",
    period: "/mo",
    description: "For small contractor teams",
    features: ["Up to 5 users", "50 work orders/mo", "Basic invoicing & GPS photos", "Email support"],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    maxUsers: 5,
    maxWorkOrders: 50,
    maxVendors: 10,
    maxStorageGB: 10,
    price: "$49",
    period: "/mo",
    description: "For small contractor teams",
    features: ["Up to 5 users", "50 work orders/mo", "Basic invoicing & GPS photos", "Email support"],
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Professional",
    maxUsers: 25,
    maxWorkOrders: 1000,
    maxVendors: 50,
    maxStorageGB: 100,
    price: "$149",
    period: "/mo",
    description: "For growing preservation vendors",
    features: ["Up to 25 users", "Unlimited work orders", "Automated email workflows", "Priority support", "API access"],
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    maxUsers: 500,
    maxWorkOrders: 10000,
    maxVendors: 250,
    maxStorageGB: 500,
    price: "$499",
    period: "/mo",
    description: "For regional & multi-crew operations",
    features: ["Up to 500 users", "Unlimited work orders", "Full Automation Engine & AI", "Internal chat & voice calling", "Dedicated account manager"],
    popular: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    maxUsers: 10000,
    maxWorkOrders: 100000,
    maxVendors: 1000,
    maxStorageGB: 2000,
    price: "Custom",
    period: "",
    description: "For national preservation enterprises",
    features: ["Unlimited users", "Custom integrations & SSO", "SLA guarantee (99.9%)", "White-label & custom branding", "24/7 VIP support"],
  },
};

export function getPlanConfig(planName?: string | null): PlanConfig {
  const normalized = (planName || "STARTER").toUpperCase().trim();
  return PLANS[normalized] || PLANS.STARTER;
}

export function getMaxUsersForPlan(planName?: string | null, customMaxUsers?: number | null): number {
  const config = getPlanConfig(planName);
  // If database has an explicitly set customMaxUsers that is greater than the standard tier, respect it;
  // otherwise enforce the correct plan standard
  if (customMaxUsers && customMaxUsers > 0) {
    return Math.max(customMaxUsers, config.maxUsers);
  }
  return config.maxUsers;
}
