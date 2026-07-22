import { PrismaClient } from "@prisma/client";

const jsonFields = ["tasks", "metadata", "paymentDetails", "categories", "tags", "skills", "specialties"];

function serializeData(data: any, visited = new WeakSet()) {
  if (!data || typeof data !== "object") return;
  if (visited.has(data)) return;
  visited.add(data);
  
  if (Array.isArray(data)) {
    data.forEach((item) => serializeData(item, visited));
    return;
  }

  // Direct constant-time checks for JSON fields
  if (data.tasks !== undefined && data.tasks !== null && typeof data.tasks !== "string") {
    try { data.tasks = JSON.stringify(data.tasks); } catch (e) {}
  }
  if (data.metadata !== undefined && data.metadata !== null && typeof data.metadata !== "string") {
    try { data.metadata = JSON.stringify(data.metadata); } catch (e) {}
  }
  if (data.paymentDetails !== undefined && data.paymentDetails !== null && typeof data.paymentDetails !== "string") {
    try { data.paymentDetails = JSON.stringify(data.paymentDetails); } catch (e) {}
  }
  if (data.categories !== undefined && data.categories !== null && typeof data.categories !== "string") {
    try { data.categories = JSON.stringify(data.categories); } catch (e) {}
  }
  if (data.tags !== undefined && data.tags !== null && typeof data.tags !== "string") {
    try { data.tags = JSON.stringify(data.tags); } catch (e) {}
  }
  if (data.skills !== undefined && data.skills !== null && typeof data.skills !== "string") {
    try { data.skills = JSON.stringify(data.skills); } catch (e) {}
  }
  if (data.specialties !== undefined && data.specialties !== null && typeof data.specialties !== "string") {
    try { data.specialties = JSON.stringify(data.specialties); } catch (e) {}
  }

  // Only recurse into properties that are objects or arrays (relations)
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === "object") {
      if (val instanceof Date || val instanceof RegExp || val instanceof ArrayBuffer) continue;
      serializeData(val, visited);
    }
  }
}

function deserializeData(result: any, visited = new WeakSet()) {
  if (!result || typeof result !== "object") return;
  if (visited.has(result)) return;
  visited.add(result);

  if (Array.isArray(result)) {
    result.forEach((item) => deserializeData(item, visited));
    return;
  }

  // Direct constant-time checks for JSON fields
  if (typeof result.tasks === "string") {
    try { result.tasks = JSON.parse(result.tasks); } catch (e) {}
  }
  if (typeof result.metadata === "string") {
    try { result.metadata = JSON.parse(result.metadata); } catch (e) {}
  }
  if (typeof result.paymentDetails === "string") {
    try { result.paymentDetails = JSON.parse(result.paymentDetails); } catch (e) {}
  }
  if (typeof result.categories === "string") {
    try { result.categories = JSON.parse(result.categories); } catch (e) {}
  }
  if (typeof result.tags === "string") {
    try { result.tags = JSON.parse(result.tags); } catch (e) {}
  }
  if (typeof result.skills === "string") {
    try { result.skills = JSON.parse(result.skills); } catch (e) {}
  }
  if (typeof result.specialties === "string") {
    try { result.specialties = JSON.parse(result.specialties); } catch (e) {}
  }

  // Only recurse into properties that are objects or arrays (relations)
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === "object") {
      if (val instanceof Date || val instanceof RegExp || val instanceof ArrayBuffer) continue;
      deserializeData(val, visited);
    }
  }
}

function createPrismaClient(): PrismaClient {
  let client: PrismaClient;

  if (process.env.NODE_ENV === "production") {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const { PrismaD1 } = require("@prisma/adapter-d1");
    
    const { env } = getCloudflareContext();
    if (env?.DB) {
      const adapter = new PrismaD1(env.DB);
      client = new PrismaClient({ adapter });
    } else {
      client = new PrismaClient();
    }
  } else {
    client = new PrismaClient();
  }

  const partitionedModels = [
    "User", "WorkOrder", "Property", "FileUpload", "Thread", "Invoice", 
    "SupportTicket", "Notification", "ActivityLog", "Channel", "ContractorBalance", 
    "Dispute", "Withdrawal", "Post", "JobRequest", "JobOffer", "ContractorProfile", 
    "Inspector", "Supplier", "Material", "PurchaseOrder", "SmsMessage", "Lead"
  ];

  // Auto-serialization and multi-tenant isolation middleware for SQLite D1 compatibility
  client.$use(async (params, next) => {
    // 1. JSON serialization for SQLite compatibility
    if (params.args && params.args.data) {
      serializeData(params.args.data);
    }

    const model = params.model;
    const action = params.action;

    // Check if query explicitly requested tenant bypass
    const bypassTenant = params.args?.bypassTenant === true;
    if (params.args && "bypassTenant" in params.args) {
      delete params.args.bypassTenant;
    }
    if (params.args?.where && "bypassTenant" in params.args.where) {
      delete params.args.where.bypassTenant;
    }

    if (model && partitionedModels.includes(model) && !bypassTenant) {
      let session: any = null;
      try {
        const { auth } = require("./auth");
        session = await auth();
      } catch (e) {
        // Safe to ignore: occurs when running builds or seeds outside of HTTP contexts
      }

      const companyId = session?.user?.companyId;
      const role = session?.user?.role;

      // Enforce companyId matches session companyId for normal users
      if (session && role !== "SUPER_ADMIN") {
        if (!companyId) {
          throw new Error(`Unauthorized: No active tenant company ID found in session for action on ${model}`);
        }

        // Auto-inject filters into read/list operations
        if (["findFirst", "findMany", "count", "updateMany", "deleteMany"].includes(action)) {
          params.args = params.args || {};
          params.args.where = params.args.where || {};
          params.args.where.companyId = companyId;
        }

        // Convert findUnique to findFirst to allow appending non-unique filters (companyId)
        if (action === "findUnique") {
          params.action = "findFirst";
          params.args = params.args || {};
          params.args.where = params.args.where || {};
          params.args.where.companyId = companyId;
        }

        // Verify record ownership before modifying specific items
        if (action === "update" || action === "delete") {
          params.args = params.args || {};
          params.args.where = params.args.where || {};
          
          const lookupWhere = { ...params.args.where, companyId, bypassTenant: true };
          const count = await (client as any)[model].count({ where: lookupWhere });
          if (count === 0) {
            throw new Error(`Unauthorized: Record in ${model} does not exist or does not belong to your company tenant.`);
          }
        }

        // Handle upsert queries by verifying ownership and tagging create/update structures
        if (action === "upsert") {
          params.args = params.args || {};
          
          params.args.create = params.args.create || {};
          params.args.create.companyId = companyId;
          
          params.args.update = params.args.update || {};
          params.args.update.companyId = companyId;

          params.args.where = params.args.where || {};
          const lookupWhere = { ...params.args.where, companyId, bypassTenant: true };
          const count = await (client as any)[model].count({ where: lookupWhere });
          if (count === 0) {
            const globalCount = await (client as any)[model].count({ where: { ...params.args.where, bypassTenant: true } });
            if (globalCount > 0) {
              throw new Error(`Unauthorized: Record in ${model} belongs to a different company tenant.`);
            }
          }
        }

        // Automatically assign companyId on item creations
        if (action === "create") {
          params.args = params.args || {};
          params.args.data = params.args.data || {};
          params.args.data.companyId = companyId;
        }

        if (action === "createMany") {
          params.args = params.args || {};
          if (Array.isArray(params.args.data)) {
            params.args.data.forEach((item: any) => {
              item.companyId = companyId;
            });
          } else if (params.args.data) {
            params.args.data.companyId = companyId;
          }
        }
      }
    }

    const result = await next(params);
    deserializeData(result);
    return result;
  });

  return client;
}

// Lazy singleton — client is only created on first use, not at build time
const globalForPrisma = globalThis as typeof globalThis & {
  _prisma?: PrismaClient;
};

import { cache } from "react";

function getPrisma(): PrismaClient {
  if (!globalForPrisma._prisma) {
    globalForPrisma._prisma = createPrismaClient();
  }
  return globalForPrisma._prisma;
}

// Proxy that defers client creation until first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
