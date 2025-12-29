import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.disable('x-powered-by');

// Render / reverse proxy (สำคัญเวลาอยู่หลัง proxy)
app.set('trust proxy', 1);

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Utils (validation / helpers)
// -----------------------------
function parseNumber(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null; // null = invalid
}

/**
 * parseBoolean
 * - undefined => "not provided"
 * - boolean => boolean
 * - string/number common forms => boolean
 * - otherwise => null (invalid)  ✅ ไม่เดาสุ่มเป็น false
 */
function parseBoolean(v) {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
    return null;
  }
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', '0', 'no', 'n'].includes(s)) return false;
    return null;
  }
  return null;
}

function pickDefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function isPrismaNotFound(err) {
  // Prisma "Record to update/delete not found." => P2025
  return err && typeof err === 'object' && err.code === 'P2025';
}

// -----------------------------
// Middleware
// -----------------------------
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CORS: รองรับ allowlist แบบ "a.com,b.com" หรือ "*" (default)
function buildCorsOrigin() {
  const raw = (process.env.CORS_ORIGIN || '*').trim();
  if (raw === '*' || raw === '') return '*';
  const allow = raw.split(',').map(s => s.trim()).filter(Boolean);
  return function origin(origin, cb) {
    // origin อาจเป็น undefined (เช่น curl / server-to-server)
    if (!origin) return cb(null, true);
    if (allow.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  };
}

app.use(cors({
  origin: buildCorsOrigin(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

// -----------------------------
// Static SPA (Quasar) - robust
// -----------------------------
const distCandidates = [
  path.join(__dirname, '../dist/spa'),
  path.join(__dirname, '../../dist/spa'),
  path.join(process.cwd(), 'dist/spa'),
];

const distPath = distCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  console.log(`✅ Serving static SPA from: ${distPath}`);
  app.use(express.static(distPath));
} else {
  console.warn('⚠️  SPA build not found (index.html missing).');
}

// -----------------------------
// Routes
// -----------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    time: new Date().toISOString(),
    distPath: distPath || 'NOT_FOUND'
  });
});

// Root handler
app.get('/', (req, res) => {
  if (distPath) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  res.json({
    ok: true,
    message: 'Backend is running, but SPA files were not found.',
    hint: 'Check build logs and dist/spa folder.'
  });
});

// -----------------------------
// Markers
// -----------------------------
app.get('/api/markers', asyncHandler(async (_req, res) => {
  const markers = await prisma.marker.findMany({ orderBy: { name: 'asc' } });
  res.json(markers);
}));

/**
 * Create/Update marker (UPSERT by name)
 * Required: name, lat, lng
 * Optional: isSafeZone
 * - ถ้าไม่ส่ง isSafeZone มา => ไม่ไปแก้ค่าเดิม
 */
app.post('/api/markers', asyncHandler(async (req, res) => {
  const { name, lat, lng, isSafeZone } = req.body ?? {};

  const safeName = String(name ?? '').trim();
  const latN = parseNumber(lat);
  const lngN = parseNumber(lng);
  const safe = parseBoolean(isSafeZone);

  if (!safeName) return res.status(400).json({ error: 'Missing required field: name' });
  if (latN === null || lngN === null || latN === undefined || lngN === undefined) {
    return res.status(400).json({ error: 'Missing/invalid required fields: lat, lng' });
  }
  if (safe === null) return res.status(400).json({ error: 'Invalid isSafeZone (expect true/false/1/0)' });

  const marker = await prisma.marker.upsert({
    where: { name: safeName },
    update: pickDefined({
      lat: latN,
      lng: lngN,
      isSafeZone: safe, // ✅ update เฉพาะเมื่อส่งมา (safe !== undefined)
    }),
    create: {
      name: safeName,
      lat: latN,
      lng: lngN,
      isSafeZone: safe ?? false,
    },
  });

  res.json(marker);
}));

app.patch('/api/markers/:name', asyncHandler(async (req, res) => {
  const name = String(req.params.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Missing name param' });

  const { lat, lng, isSafeZone } = req.body ?? {};
  const latN = parseNumber(lat);
  const lngN = parseNumber(lng);
  const safe = parseBoolean(isSafeZone);

  if (latN === null || lngN === null) return res.status(400).json({ error: 'Invalid lat/lng' });
  if (safe === null) return res.status(400).json({ error: 'Invalid isSafeZone (expect true/false/1/0)' });

  try {
    const updated = await prisma.marker.update({
      where: { name },
      data: pickDefined({
        lat: latN,
        lng: lngN,
        isSafeZone: safe,
      }),
    });
    res.json(updated);
  } catch (err) {
    if (isPrismaNotFound(err)) return res.status(404).json({ error: 'Marker not found' });
    throw err;
  }
}));

app.delete('/api/markers/:name', asyncHandler(async (req, res) => {
  const name = String(req.params.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Missing name param' });

  try {
    await prisma.marker.delete({ where: { name } });
    res.json({ message: 'Marker deleted' });
  } catch (err) {
    if (isPrismaNotFound(err)) return res.status(404).json({ error: 'Marker not found' });
    throw err;
  }
}));

// -----------------------------
// Edges
// -----------------------------
app.get('/api/edges', asyncHandler(async (_req, res) => {
  const edges = await prisma.edge.findMany({ orderBy: { id: 'asc' } });
  res.json(edges);
}));

app.post('/api/edges', asyncHandler(async (req, res) => {
  const { id, nameA, latA, lngA, nameB, latB, lngB, distance, time } = req.body ?? {};

  const idN = parseNumber(id);
  const latAN = parseNumber(latA);
  const lngAN = parseNumber(lngA);
  const latBN = parseNumber(latB);
  const lngBN = parseNumber(lngB);
  const distN = parseNumber(distance);
  const timeN = parseNumber(time);

  const a = String(nameA ?? '').trim();
  const b = String(nameB ?? '').trim();

  if (!a || !b) return res.status(400).json({ error: 'Missing required fields: nameA, nameB' });
  if ([latAN, lngAN, latBN, lngBN].some(v => v === null || v === undefined)) {
    return res.status(400).json({ error: 'Missing/invalid required fields for edge: latA/lngA/latB/lngB' });
  }
  if (idN === null) return res.status(400).json({ error: 'Invalid id' });
  if (distN === null) return res.status(400).json({ error: 'Invalid distance' });
  if (timeN === null) return res.status(400).json({ error: 'Invalid time' });

  const data = {
    nameA: a,
    latA: latAN,
    lngA: lngAN,
    nameB: b,
    latB: latBN,
    lngB: lngBN,
    distance: distN ?? 0,
    time: timeN ?? 0,
  };

  // ถ้ามี id => update ตาม id
  if (idN !== undefined) {
    try {
      const edge = await prisma.edge.update({ where: { id: Number(idN) }, data });
      return res.json(edge);
    } catch (err) {
      if (isPrismaNotFound(err)) return res.status(404).json({ error: 'Edge not found' });
      throw err;
    }
  }

  // ไม่ส่ง id => upsert แบบ symmetric pair
  const existingEdge = await prisma.edge.findFirst({
    where: {
      OR: [
        { nameA: a, nameB: b },
        { nameA: b, nameB: a },
      ],
    },
  });

  if (existingEdge) {
    const edge = await prisma.edge.update({ where: { id: existingEdge.id }, data });
    return res.json(edge);
  }

  const edge = await prisma.edge.create({ data });
  res.json(edge);
}));

app.delete('/api/edges/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    await prisma.edge.delete({ where: { id } });
    res.json({ message: 'Edge deleted' });
  } catch (err) {
    if (isPrismaNotFound(err)) return res.status(404).json({ error: 'Edge not found' });
    throw err;
  }
}));

// -----------------------------
// Outdoor Routing (OSRM Proxy with Caching)
// -----------------------------
const routeCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

app.post('/api/route/osrm', asyncHandler(async (req, res) => {
  const { profile = 'foot', from, to } = req.body ?? {};

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing from/to coordinates' });
  }

  // Create a cache key based on rounded coordinates (approx 1m precision)
  const cacheKey = `${profile}:${from.lat.toFixed(5)},${from.lng.toFixed(5)}:${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;

  if (routeCache.has(cacheKey)) {
    const cached = routeCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }
    routeCache.delete(cacheKey);
  }

  const url = `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const data = await response.json();

    const route = data?.routes?.[0];
    if (!route) {
      return res.status(404).json({ error: 'No route found' });
    }

    const polyline = (route.geometry.coordinates || []).map(([lng, lat]) => [lat, lng]);
    const legs = route.legs || [];
    const instructions = [];
    const stepPoints = [];
    for (const leg of legs) {
      for (const st of (leg.steps || [])) {
        const name = st.name ? `บน ${st.name}` : '';
        const man = st.maneuver?.type || 'เดินต่อไป';
        instructions.push(`${man} ${name}`.trim());
        const loc = st.maneuver?.location;
        if (loc) stepPoints.push([loc[1], loc[0]]);
      }
    }

    const result = {
      polyline,
      instructions,
      stepPoints,
      totalDistance: route.distance || 0,
      totalTime: (route.duration || 0) / 60,
    };

    // Save to cache
    routeCache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Simple cache cleanup (keep it small)
    if (routeCache.size > 100) {
      const first = routeCache.keys().next().value;
      routeCache.delete(first);
    }

    res.json(result);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'OSRM request timed out' });
    }
    console.error('OSRM fetch error:', err);
    res.status(502).json({ error: 'Failed to fetch from OSRM' });
  }
}));


// -----------------------------
// SPA Catch-all (ต้องอยู่ท้ายสุด)
// -----------------------------
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (distPath) return res.sendFile(path.join(distPath, 'index.html'));
  return res.status(404).json({ error: 'Not found' });
});

// -----------------------------
// Error handler (สุดท้ายจริงๆ)
// -----------------------------
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err);

  // CORS error
  if (String(err?.message || '').startsWith('CORS blocked:')) {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// -----------------------------
// Start + Graceful shutdown
// -----------------------------
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('Error disconnecting Prisma:', e);
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
