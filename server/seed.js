#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SHARED_LOCATIONS = [
    { name: "อาคาร 1 อาคารอำนวยการ", lat: 18.758769, lng: 99.014645 },
    { name: "อาคาร 2 อาคารสารสนเทศ", lat: 18.758914, lng: 99.015257 },
    { name: "อาคาร 3 อาคารประถมศึกษา", lat: 18.758361, lng: 99.015129 },
    { name: "อาคาร 4 อาคารมัธยมศึกษาตอนต้น", lat: 18.757983, lng: 99.015512 },
    { name: "อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร", lat: 18.758168, lng: 99.015763 },
    { name: "อาคาร 6 อาคารพลศึกษา ห้องสภานักเรียน", lat: 18.757394, lng: 99.015381 },
    { name: "อาคาร 7 อาคารมัธยมศึกษาตอนปลาย ห้องสมุด", lat: 18.757590, lng: 99.015905 },
    { name: "สนามฟุตซอล (Futsal)", lat: 18.757955, lng: 99.015097 },
    { name: "สนามหญ้าจริง (Safe Zone)", lat: 18.757826, lng: 99.014679 },
    { name: "สนามบาสเก็ดบอล", lat: 18.757833, lng: 99.015761 },
];

const SHARED_EDGES = [
    { nameA: "อาคาร 1 อาคารอำนวยการ", nameB: "อาคาร 3 อาคารประถมศึกษา", distance: 50, time: 2 },
    { nameA: "อาคาร 3 อาคารประถมศึกษา", nameB: "สนามฟุตซอล (Futsal)", distance: 40, time: 1 },
    { nameA: "สนามฟุตซอล (Futsal)", nameB: "สนามหญ้าจริง (Safe Zone)", distance: 30, time: 1 },
    { nameA: "อาคาร 2 อาคารสารสนเทศ", nameB: "สนามฟุตซอล (Futsal)", distance: 60, time: 2 },
    { nameA: "อาคาร 1 อาคารอำนวยการ", nameB: "อาคาร 2 อาคารสารสนเทศ", distance: 15, time: 1 },
    { nameA: "อาคาร 2 อาคารสารสนเทศ", nameB: "อาคาร 3 อาคารประถมศึกษา", distance: 45, time: 2 },
    { nameA: "อาคาร 4 อาคารมัธยมศึกษาตอนต้น", nameB: "สนามฟุตซอล (Futsal)", distance: 25, time: 1 },
    { nameA: "อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร", nameB: "อาคาร 4 อาคารมัธยมศึกษาตอนต้น", distance: 35, time: 1 },
    { nameA: "อาคาร 6 อาคารพลศึกษา ห้องสภานักเรียน", nameB: "สนามหญ้าจริง (Safe Zone)", distance: 55, time: 2 },
    { nameA: "อาคาร 7 อาคารมัธยมศึกษาตอนปลาย ห้องสมุด", nameB: "สนามบาสเก็ดบอล", distance: 40, time: 2 },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await prisma.edge.deleteMany({});
    console.log('   ✓ Cleared edges');

    await prisma.marker.deleteMany({});
    console.log('   ✓ Cleared markers');

    // Seed markers
    console.log('\n📍 Seeding markers...');
    for (const location of SHARED_LOCATIONS) {
      await prisma.marker.create({
        data: {
          name: location.name,
          lat: location.lat,
          lng: location.lng,
        },
      });
      console.log(`   ✓ Added: ${location.name}`);
    }
    console.log(`✅ Successfully seeded ${SHARED_LOCATIONS.length} markers`);

    // Seed edges
    console.log('\n🔗 Seeding edges...');
    for (const edge of SHARED_EDGES) {
      await prisma.edge.create({
        data: {
          nameA: edge.nameA,
          nameB: edge.nameB,
          latA: SHARED_LOCATIONS.find(l => l.name === edge.nameA).lat,
          lngA: SHARED_LOCATIONS.find(l => l.name === edge.nameA).lng,
          latB: SHARED_LOCATIONS.find(l => l.name === edge.nameB).lat,
          lngB: SHARED_LOCATIONS.find(l => l.name === edge.nameB).lng,
          distance: edge.distance,
          time: edge.time,
        },
      });
      console.log(`   ✓ Added: ${edge.nameA} ↔️ ${edge.nameB}`);
    }
    console.log(`✅ Successfully seeded ${SHARED_EDGES.length} edges`);

    // Get statistics
    const markerCount = await prisma.marker.count();
    const edgeCount = await prisma.edge.count();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Database Statistics:');
    console.log('='.repeat(60));
    console.log(`   Total Markers: ${markerCount}`);
    console.log(`   Total Edges: ${edgeCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
