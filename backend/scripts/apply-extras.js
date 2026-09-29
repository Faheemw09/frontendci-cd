/**
 * Applies prisma/extras.sql (partial unique indexes) against DATABASE_URL.
 * Run after `npx prisma migrate dev`.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, '..', 'prisma', 'extras.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  // Split on semicolons; skip empty / comment-only chunks
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.split('\n').every((line) => line.trim().startsWith('--') || !line.trim()));

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
    console.log('Applied:', statement.slice(0, 60).replace(/\s+/g, ' ') + '…');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
