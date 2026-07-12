import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// List of files containing the term
const files = [
  "src/app/api/admin/users/route.ts",
  "src/app/api/ai/image-search/route.ts",
  "src/app/api/assets/route.ts",
  "src/app/api/chat/channels/[id]/messages/route.ts",
  "src/app/api/coordinators/route.ts",
  "src/app/api/inspectors/route.ts",
  "src/app/api/logistics/route.ts",
  "src/app/api/network/feed/route.ts",
  "src/app/api/network/posts/[id]/comments/route.ts",
  "src/app/api/vendors/route.ts",
  "src/app/api/work-orders/[id]/route.ts",
  "src/app/api/work-orders/import/auto/route.ts",
  "src/app/api/work-orders/import/route.ts",
  "src/app/api/work-orders/property-history/route.ts",
  "src/app/api/work-orders/route.ts"
];

console.log("Removing 'mode: \"insensitive\"' from Prisma queries...");

for (const file of files) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");
  
  // Replace:
  // , mode: "insensitive"
  // or
  // , mode: 'insensitive'
  // or
  // mode: "insensitive", 
  // or
  // mode: 'insensitive',
  content = content.replace(/,\s*mode:\s*["']insensitive["']/g, "");
  content = content.replace(/mode:\s*["']insensitive["'],?\s*/g, "");

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  Patched file: ${file}`);
}

console.log("Finished patching files!");
