import pg from "pg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const neonUrl = "postgresql://neondb_owner:npg_x5CZw3eQfvIr@ep-solitary-heart-ai0a0okd-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Mapping Postgres table names to SQLite/D1 table names
const TABLE_MAPPINGS = {
  "User": "users",
  "Account": "accounts",
  "Session": "sessions",
  "FileUpload": "work_order_files",
};

async function main() {
  console.log("Connecting to Neon PostgreSQL...");
  const client = new pg.Client({ connectionString: neonUrl });
  await client.connect();

  console.log("Querying list of tables in public schema...");
  const tableRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  
  const tables = tableRes.rows.map(row => row.table_name);
  console.log(`Found ${tables.length} tables to dump.`);

  // Temporary SQL file path
  const sqlFilePath = path.resolve("scratch/d1_inserts.sql");
  const sqlStream = fs.createWriteStream(sqlFilePath);

  // Disable foreign keys checks for bulk insert
  sqlStream.write("PRAGMA foreign_keys = OFF;\n");

  // Keep track of counts
  let totalRows = 0;

  for (const table of tables) {
    const d1Table = TABLE_MAPPINGS[table] || table;
    console.log(`Dumping table: ${table} -> D1 Table: ${d1Table}`);

    // Query all records
    const records = await client.query(`SELECT * FROM "${table}"`);
    if (records.rows.length === 0) {
      console.log(`  Table ${table} is empty. Skipping.`);
      continue;
    }

    totalRows += records.rows.length;

    // Build the columns list
    const cols = records.fields.map(f => {
      // Map postgres column names to SQLite matching names if mapped
      if (table === "User") {
        if (f.name === "emailVerified") return "emailVerified";
        if (f.name === "hashedPassword") return "hashedPassword";
        if (f.name === "isActive") return "isActive";
        if (f.name === "createdAt") return "createdAt";
        if (f.name === "updatedAt") return "updatedAt";
      }
      if (table === "FileUpload") {
        if (f.name === "workOrderId") return "work_order_id";
        if (f.name === "path") return "public_url";
        if (f.name === "originalName") return "original_name";
        if (f.name === "mimeType") return "mime_type";
        if (f.name === "uploaderId") return "uploader_id";
        if (f.name === "createdAt") return "created_at";
      }
      return f.name;
    });

    const columnsList = cols.map(c => `"${c}"`).join(", ");

    // Generate INSERT statements
    for (const row of records.rows) {
      const values = records.fields.map(f => {
        const val = row[f.name];
        if (val === null || val === undefined) {
          return "NULL";
        }
        if (val instanceof Date) {
          return `'${val.toISOString()}'`;
        }
        if (typeof val === "object") {
          // Serialize JSON objects/arrays to string for D1
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
        if (typeof val === "string") {
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === "boolean") {
          return val ? "1" : "0";
        }
        return val;
      });

      sqlStream.write(`INSERT OR REPLACE INTO "${d1Table}" (${columnsList}) VALUES (${values.join(", ")});\n`);
    }
  }

  sqlStream.end();

  console.log(`Successfully generated SQL insert dump with ${totalRows} rows at scratch/d1_inserts.sql.`);
  await client.end();

  // Execute remote SQL via wrangler
  console.log("Executing SQL insert dump against remote D1 database...");
  try {
    const result = execSync(
      `npx wrangler d1 execute proppreserve --remote --file=scratch/d1_inserts.sql --yes`,
      { encoding: "utf8" }
    );
    console.log("Wrangler D1 execution result:");
    console.log(result);
  } catch (err) {
    console.error("Failed to execute SQL against D1:", err.message);
    console.error(err.stdout);
  }
}

main().catch(console.error);
