import { PrismaClient } from "@prisma/client";

async function testConnection(url: string, name: string) {
  console.log(`\nTesting connection to: ${name}...`);
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error']
  });

  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log(`Success for ${name}! Result:`, result);
    return true;
  } catch (err) {
    console.error(`Connection failed for ${name}:`, err);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const poolerUrl = "postgresql://neondb_owner:npg_Ew7sjqRF4uvA@ep-bitter-mode-aqmk4sq6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";
  const directUrl = "postgresql://neondb_owner:npg_Ew7sjqRF4uvA@ep-bitter-mode-aqmk4sq6.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";

  const poolerOk = await testConnection(poolerUrl, "Pooler Endpoint");
  const directOk = await testConnection(directUrl, "Direct Endpoint");
  
  console.log(`\nResults: Pooler = ${poolerOk}, Direct = ${directOk}`);
}

main();
