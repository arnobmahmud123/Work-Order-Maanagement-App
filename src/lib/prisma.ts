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
    const adapter = new PrismaD1(env.DB);
    client = new PrismaClient({ adapter });
  } else {
    client = new PrismaClient();
  }

  // Auto-serialization middleware for SQLite D1 compatibility
  client.$use(async (params, next) => {
    if (params.args && params.args.data) {
      serializeData(params.args.data);
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
