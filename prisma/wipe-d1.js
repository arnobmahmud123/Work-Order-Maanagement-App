const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = process.argv.includes('--remote') ? '--remote' : '--local';

async function wipeD1() {
  console.log(`=== WIPING DATABASE: ${target} ===`);
  
  // 1. Get list of tables
  let tablesList = [];
  try {
    const listOut = execSync(`npx wrangler d1 execute proppreserve ${target} --command="SELECT name FROM sqlite_master WHERE type='table'" --json`, { encoding: 'utf8' });
    const parsed = JSON.parse(listOut);
    const results = parsed[0]?.results || [];
    tablesList = results
      .map(r => r.name)
      .filter(name => name !== 'sqlite_sequence' && !name.startsWith('_cf_'));
    console.log(`Discovered ${tablesList.length} tables to drop:`, tablesList.join(', '));
  } catch (err) {
    console.error("Failed to query tables list:", err.message);
    return;
  }

  if (tablesList.length === 0) {
    console.log("No tables found. Database is already clean.");
    return;
  }

  // 2. Generate DROP queries in reverse order to respect foreign key constraints
  let dropSql = "PRAGMA foreign_keys = OFF;\n\n";
  for (const table of tablesList.reverse()) {
    dropSql += `DROP TABLE IF EXISTS "${table}";\n`;
  }
  dropSql += "\nPRAGMA foreign_keys = ON;\n";

  const dropFilePath = path.join(__dirname, 'wipe_temp.sql');
  fs.writeFileSync(dropFilePath, dropSql, 'utf8');

  // 3. Execute drop commands
  try {
    console.log(`Executing drops on D1 (${target})...`);
    execSync(`npx wrangler d1 execute proppreserve ${target} --file=${dropFilePath} --yes`);
    console.log("✔ Database wiped successfully.");
  } catch (err) {
    console.error("Failed to execute drop script:", err.message);
  } finally {
    try { fs.unlinkSync(dropFilePath); } catch {}
  }
}

wipeD1().catch(err => console.error(err));
