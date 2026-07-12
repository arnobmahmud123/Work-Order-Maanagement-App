import fs from "fs";
import path from "path";

const sqlPath = path.resolve("scratch/d1_schema.sql");
let sql = fs.readFileSync(sqlPath, "utf8");

// 1. Table mapping replacements (global)
const replacements = [
  { from: '"User"', to: '"users"' },
  { from: '"Account"', to: '"accounts"' },
  { from: '"Session"', to: '"sessions"' },
  { from: '"VerificationToken"', to: '"verification_tokens"' },
  { from: '"FileUpload"', to: '"work_order_files"' },
];

for (const rep of replacements) {
  const regex = new RegExp(rep.from, "g");
  sql = sql.replace(regex, rep.to);
}

// 2. Perform column replacements specifically on the "work_order_files" table block
const filesTableRegex = /CREATE TABLE "work_order_files" \([\s\S]+?\);/;
const match = sql.match(filesTableRegex);

if (match) {
  let tableSql = match[0];
  tableSql = tableSql.replace(/"workOrderId"/g, '"work_order_id"');
  tableSql = tableSql.replace(/"originalName"/g, '"original_name"');
  tableSql = tableSql.replace(/"mimeType"/g, '"mime_type"');
  tableSql = tableSql.replace(/"uploaderId"/g, '"uploader_id"');
  tableSql = tableSql.replace(/"createdAt"/g, '"created_at"');
  tableSql = tableSql.replace(/"path"/g, '"public_url"');
  
  sql = sql.replace(filesTableRegex, tableSql);
  console.log("Successfully patched work_order_files table columns!");
} else {
  console.log("Could not find work_order_files table block.");
}

fs.writeFileSync(sqlPath, sql, "utf8");
console.log("Patched schema SQL successfully!");
