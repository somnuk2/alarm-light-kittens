import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Get all markers
app.get('/api/markers', async (req, res) => {
  try {
    const markers = await prisma.marker.findMany();
    res.json(markers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    res.status(500).json({ error: 'Failed to fetch markers' });
  }
});

// Create or Update marker
app.post('/api/markers', async (req, res) => {
  const { name, lat, lng } = req.body;

  if (!name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const marker = await prisma.marker.upsert({
      where: { name },
      update: { lat, lng },
      create: { name, lat, lng }
    });
    res.json(marker);
  } catch (error) {
    console.error('Error saving marker:', error);
    res.status(500).json({ error: 'Failed to save marker' });
  }
});

// Delete marker
app.delete('/api/markers/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await prisma.marker.delete({
      where: { name }
    });
    res.json({ message: 'Marker deleted' });
  } catch (error) {
    console.error('Error deleting marker:', error);
    res.status(500).json({ error: 'Failed to delete marker' });
  }
});

// Get all edges
app.get('/api/edges', async (req, res) => {
  try {
    const edges = await prisma.edge.findMany();
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

// Create or Update edge
app.post('/api/edges', async (req, res) => {
  const { id, nameA, latA, lngA, nameB, latB, lngB, distance, time } = req.body;

  try {
    if (id) {
      // Update
      const edge = await prisma.edge.update({
        where: { id: Number(id) },
        data: {
          nameA, latA: Number(latA), lngA: Number(lngA),
          nameB, latB: Number(latB), lngB: Number(lngB),
          distance: Number(distance), time: Number(time)
        }
      });
      res.json(edge);
    } else {
      // Create
      const edge = await prisma.edge.create({
        data: {
          nameA, latA: Number(latA), lngA: Number(lngA),
          nameB, latB: Number(latB), lngB: Number(lngB),
          distance: Number(distance), time: Number(time)
        }
      });
      res.json(edge);
    }
  } catch (error) {
    console.error('Error saving edge:', error);
    res.status(500).json({ error: 'Failed to save edge' });
  }
});

// Delete edge
app.delete('/api/edges/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.edge.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Edge deleted' });
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
