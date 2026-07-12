import fs from "fs";
import path from "path";

const schemaPath = path.resolve("prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// 1. Change provider to sqlite
schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = "file:./dev.db"');

// 2. Find all enums
const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
const enums = new Set();
let match;
while ((match = enumRegex.exec(schema)) !== null) {
  enums.add(match[1]);
}

console.log("Found enums to convert to String:", Array.from(enums));

// 3. Remove enum definitions
schema = schema.replace(enumRegex, "");

// 4. Replace enum types in models with String
for (const enumName of enums) {
  const regex = new RegExp(`:\\s*${enumName}(\\s|\\n|\\?)`, "g");
  schema = schema.replace(regex, ": String$1");
  
  const regex2 = new RegExp(`\\s+${enumName}(\\s|\\n|\\?)`, "g");
  schema = schema.replace(regex2, " String$1");

  const defaultRegex = new RegExp(`@default\\((${enumName}|[A-Z0-9_]+)\\)`, "g");
  schema = schema.replace(defaultRegex, (m, val) => {
    if (val === "true" || val === "false" || !isNaN(val)) return m;
    return `@default("${val}")`;
  });
}

// 5. Replace unsupported types for SQLite
schema = schema.replace(/\bJson\b/g, "String");
schema = schema.replace(/\bString\[\]/g, "String");

// 6. Fix defaults for converted list fields
schema = schema.replace(/@default\(\[\]\)/g, '@default("")');

// 7. Replace unsupported postgres tags
schema = schema.replace(/@db\.Text/g, "");
schema = schema.replace(/@db\.Uuid/g, "");
schema = schema.replace(/@db\.VarChar\(\d+\)/g, "");

// Write back to schema.prisma
fs.writeFileSync(schemaPath, schema, "utf8");
console.log("Successfully converted schema.prisma to SQLite!");
