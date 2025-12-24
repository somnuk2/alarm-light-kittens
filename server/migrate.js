#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting database migration...');

  try {
    // Try to connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Create tables if they don't exist
    // markers table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "markers" (
        "name" TEXT PRIMARY KEY,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created markers table');

    // edges table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "edges" (
        "id" SERIAL PRIMARY KEY,
        "nameA" TEXT NOT NULL,
        "latA" DOUBLE PRECISION NOT NULL,
        "lngA" DOUBLE PRECISION NOT NULL,
        "nameB" TEXT NOT NULL,
        "latB" DOUBLE PRECISION NOT NULL,
        "lngB" DOUBLE PRECISION NOT NULL,
        "distance" DOUBLE PRECISION NOT NULL,
        "time" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created edges table');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
