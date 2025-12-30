import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GATES = [
    { name: "Gate 1 (ทางเข้าหลัก)", lat: 18.758800, lng: 99.014450 },
    { name: "Gate 2 (ทางเข้าอนุบาล)", lat: 18.758300, lng: 99.016000 }
];

const TARGET_BUILDINGS = {
    gate1_target: "อาคาร 1 อาคารอำนวยการ",
    gate2_target: "อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร"
};

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Radius of the earth in m
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in m
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

async function main() {
    console.log('🚀 Starting to add gates...');

    // 1. Upsert Markers (Gates)
    for (const gate of GATES) {
        console.log(`Processing ${gate.name}...`);
        await prisma.marker.upsert({
            where: { name: gate.name },
            update: { lat: gate.lat, lng: gate.lng },
            create: {
                name: gate.name,
                lat: gate.lat,
                lng: gate.lng,
                isSafeZone: false
            }
        });
    }
    console.log('✅ Gates upserted.');

    // 2. Fetch Target Buildings to get their coords
    const b1 = await prisma.marker.findUnique({ where: { name: TARGET_BUILDINGS.gate1_target } });
    const b5 = await prisma.marker.findUnique({ where: { name: TARGET_BUILDINGS.gate2_target } });

    if (!b1 || !b5) {
        console.error('❌ Could not find target buildings in DB. Check names.');
        if (!b1) console.error(`Missing: ${TARGET_BUILDINGS.gate1_target}`);
        if (!b5) console.error(`Missing: ${TARGET_BUILDINGS.gate2_target}`);
        return;
    }

    // 3. Create Edges
    // Edge 1: Gate 1 <-> Bldg 1
    const gate1 = GATES.find(g => g.name.includes("Gate 1"));
    const dist1 = getDistanceFromLatLonInM(gate1.lat, gate1.lng, b1.lat, b1.lng);
    const time1 = Math.round(dist1 / 80); // ~80m/min walking speed

    console.log(`Creating Edge: ${gate1.name} <-> ${b1.name} (${Math.round(dist1)}m)`);

    // Check if edge exists (A-B or B-A)
    let edge1 = await prisma.edge.findFirst({
        where: {
            OR: [
                { nameA: gate1.name, nameB: b1.name },
                { nameA: b1.name, nameB: gate1.name }
            ]
        }
    });

    const edgeData1 = {
        nameA: gate1.name,
        latA: gate1.lat,
        lngA: gate1.lng,
        nameB: b1.name,
        latB: b1.lat,
        lngB: b1.lng,
        distance: Math.round(dist1),
        time: Math.max(1, time1)
    };

    if (edge1) {
        await prisma.edge.update({ where: { id: edge1.id }, data: edgeData1 });
    } else {
        await prisma.edge.create({ data: edgeData1 });
    }

    // Edge 2: Gate 2 <-> Bldg 5
    const gate2 = GATES.find(g => g.name.includes("Gate 2"));
    const dist2 = getDistanceFromLatLonInM(gate2.lat, gate2.lng, b5.lat, b5.lng);
    const time2 = Math.round(dist2 / 80);

    console.log(`Creating Edge: ${gate2.name} <-> ${b5.name} (${Math.round(dist2)}m)`);

    let edge2 = await prisma.edge.findFirst({
        where: {
            OR: [
                { nameA: gate2.name, nameB: b5.name },
                { nameA: b5.name, nameB: gate2.name }
            ]
        }
    });

    const edgeData2 = {
        nameA: gate2.name,
        latA: gate2.lat,
        lngA: gate2.lng,
        nameB: b5.name,
        latB: b5.lat,
        lngB: b5.lng,
        distance: Math.round(dist2),
        time: Math.max(1, time2)
    };

    if (edge2) {
        await prisma.edge.update({ where: { id: edge2.id }, data: edgeData2 });
    } else {
        await prisma.edge.create({ data: edgeData2 });
    }

    console.log('✅ Edges processed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
