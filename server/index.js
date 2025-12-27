import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3000);

// -----------------------------
// Utilities
// -----------------------------
function toNumber(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * normalize boolean input
 * - returns `undefined` when v is undefined (means "not provided")
 * - returns boolean for a wide range of inputs
 */
function normalizeBoolOrUndefined(v) {
  if (v === undefined) return undefined;

  if (typeof v === 'boolean') return v;

  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }

  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
  }

  // fallback: treat other weird values as false
  return false;
}

function pickDefined(obj) {
  // remove keys with value `undefined` (Prisma won't update those)
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// -----------------------------
// Middleware
// -----------------------------
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Serve Static Files from Quasar SPA
const distPath = path.join(__dirname, '../dist/spa');
app.use(express.static(distPath));

// Health check for Render
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'running' });
});

// Get all markers
app.get('/api/markers', async (_req, res) => {
  try {
    const markers = await prisma.marker.findMany({ orderBy: { name: 'asc' } });
    res.json(markers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    res.status(500).json({ error: 'Failed to fetch markers' });
  }
});

/**
 * Create or Update marker (UPSERT by name)
 * Required: name, lat, lng
 * Optional: isSafeZone
 *
 * ✅ Important fix: if isSafeZone is not provided => do NOT update it (prevents reset to false)
 */
app.post('/api/markers', async (req, res) => {
  const { name, lat, lng, isSafeZone } = req.body ?? {};

  const safeName = String(name ?? '').trim();
  const latN = toNumber(lat);
  const lngN = toNumber(lng);
  const safe = normalizeBoolOrUndefined(isSafeZone);

  if (!safeName || latN === null || lngN === null) {
    return res.status(400).json({ error: 'Missing/invalid required fields: name, lat, lng' });
  }

  try {
    const marker = await prisma.marker.upsert({
      where: { name: safeName },
      update: pickDefined({
        lat: latN,
        lng: lngN,
        isSafeZone: safe, // ✅ update only if provided
      }),
      create: {
        name: safeName,
        lat: latN,
        lng: lngN,
        isSafeZone: safe ?? false,
      },
    });

    res.json(marker);
  } catch (error) {
    console.error('Error saving marker:', error);
    res.status(500).json({ error: 'Failed to save marker' });
  }
});

// Optional (recommended): PATCH marker partial update
app.patch('/api/markers/:name', async (req, res) => {
  const name = String(req.params.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Missing name param' });

  const { lat, lng, isSafeZone } = req.body ?? {};

  const latN = lat === undefined ? undefined : toNumber(lat);
  const lngN = lng === undefined ? undefined : toNumber(lng);
  const safe = normalizeBoolOrUndefined(isSafeZone);

  if (latN === null || lngN === null) {
    return res.status(400).json({ error: 'Invalid lat/lng' });
  }

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
  } catch (error) {
    console.error('Error patching marker:', error);
    res.status(500).json({ error: 'Failed to patch marker' });
  }
});

// Delete marker
app.delete('/api/markers/:name', async (req, res) => {
  const name = String(req.params.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Missing name param' });

  try {
    await prisma.marker.delete({ where: { name } });
    res.json({ message: 'Marker deleted' });
  } catch (error) {
    console.error('Error deleting marker:', error);
    res.status(500).json({ error: 'Failed to delete marker' });
  }
});

// Get all edges
app.get('/api/edges', async (_req, res) => {
  try {
    const edges = await prisma.edge.findMany({ orderBy: { id: 'asc' } });
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

// Create or Update edge
app.post('/api/edges', async (req, res) => {
  const { id, nameA, latA, lngA, nameB, latB, lngB, distance, time } = req.body ?? {};

  const latAN = toNumber(latA);
  const lngAN = toNumber(lngA);
  const latBN = toNumber(latB);
  const lngBN = toNumber(lngB);
  const distN = toNumber(distance);
  const timeN = toNumber(time);

  if (!nameA || !nameB || latAN === null || lngAN === null || latBN === null || lngBN === null) {
    return res.status(400).json({ error: 'Missing/invalid required fields for edge' });
  }

  try {
    if (id) {
      const edge = await prisma.edge.update({
        where: { id: Number(id) },
        data: {
          nameA,
          latA: latAN,
          lngA: lngAN,
          nameB,
          latB: latBN,
          lngB: lngBN,
          distance: distN ?? 0,
          time: timeN ?? 0,
        },
      });
      return res.json(edge);
    }

    const existingEdge = await prisma.edge.findFirst({
      where: {
        OR: [
          { nameA, nameB },
          { nameA: nameB, nameB: nameA },
        ],
      },
    });

    const data = {
      nameA,
      latA: latAN,
      lngA: lngAN,
      nameB,
      latB: latBN,
      lngB: lngBN,
      distance: distN ?? 0,
      time: timeN ?? 0,
    };

    if (existingEdge) {
      const edge = await prisma.edge.update({
        where: { id: existingEdge.id },
        data,
      });
      return res.json(edge);
    }

    const edge = await prisma.edge.create({ data });
    res.json(edge);
  } catch (error) {
    console.error('Error saving edge:', error);
    res.status(500).json({ error: 'Failed to save edge' });
  }
});

// Delete edge
app.delete('/api/edges/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    await prisma.edge.delete({ where: { id } });
    res.json({ message: 'Edge deleted' });
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

// SPA Catch-all: Always serve index.html for unknown routes to handle client-side routing
app.get('*', (req, res) => {
  // Check if request is for /api or other excluded paths
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// -----------------------------
// Start + Graceful shutdown
// -----------------------------
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
