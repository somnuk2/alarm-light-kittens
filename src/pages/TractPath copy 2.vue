<template>
  <div class="page-wrapper">
    <div class="container">
      <h1>🗺️ การนำทางบุคคลไปจุดปลอดภัย</h1>
      <p class="subtitle">โรงเรียนวารีเชียงใหม่ - ค้นหาเส้นทางปลอดภัยไปยังจุดหมาย</p>

      <!-- NAVIGATION SECTION -->
      <section class="navigation-card">
        <div class="nav-header">
          <h2 class="nav-title">📍 ระบบนำทาง Real-time</h2>
          <p class="nav-description">ติดตามตำแหน่งของคุณและคำนวณเส้นทางสด</p>
        </div>

        <div class="nav-controls">
          <!-- Current Location / Tracking Control -->
          <div class="location-input-group">
            <div class="location-badge current">
              <span class="badge-icon">🏃‍♂️</span>
              <div class="badge-content">
                <span class="badge-label">สถานะการติดตาม</span>
                <span class="badge-value" v-if="isTracking">
                  กำลังติดตาม... ({{ currentLocation ? `${currentLocation.lat.toFixed(5)},
                  ${currentLocation.lng.toFixed(5)}` : 'รอสัญญาณ GPS...' }})
                </span>
                <span class="badge-value empty" v-else>
                  ❌ ไม่ได้ติดตามตำแหน่ง
                </span>
              </div>
            </div>
            <button @click="toggleTracking" class="btn btn-locate"
              :class="{ 'is-active': isTracking, 'loading': geoLoading }">
              {{ isTracking ? '⏹️ หยุดติดตาม' : '▶️ เริ่มติดตาม' }}
            </button>
          </div>

          <!-- Arrow -->
          <div class="nav-arrow">
            <span class="arrow-icon">⬇</span>
          </div>

          <!-- Destination -->
          <div class="location-input-group">
            <div class="location-badge destination">
              <span class="badge-icon">🎯</span>
              <div class="badge-content">
                <span class="badge-label">ปลายทาง</span>
                <select v-model="selectedDestination" class="destination-select" @change="onDestinationChange">
                  <option :value="null">-- เลือกปลายทาง --</option>
                  <option v-for="name in graphNodeNames" :key="name" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
            </div>
            <button @click="recenterMap" class="btn btn-navigate" :disabled="!currentLocation">
              📍 Recenter
            </button>
          </div>
        </div>

        <!-- Dynamic Stats -->
        <div v-if="selectedDestination" class="route-stats-grid">
          <!-- Total Stats -->
          <div class="stat-card">
            <div class="stat-label">🏁 ระยะทางทั้งหมด</div>
            <div class="stat-value">{{ totalStats.distance }} ม.</div>
            <div class="stat-sub">{{ totalStats.time }} นาที</div>
          </div>
          <!-- Remaining Stats -->
          <div class="stat-card highlight">
            <div class="stat-label">🚶 เหลือระยะทาง</div>
            <div class="stat-value">{{ remainingStats.distance }} ม.</div>
            <div class="stat-sub">{{ remainingStats.time }} นาที</div>
          </div>
        </div>

        <!-- Quick Access Buttons (Safe Locations) -->
        <div class="quick-access">
          <span class="quick-title">📌 สถานที่ปลอดภัย:</span>
          <div class="quick-buttons">
            <button v-for="place in safeLocations" :key="place" @click="selectSafeLocation(place)" class="quick-btn">
              {{ place }}
            </button>
          </div>
        </div>
      </section>

      <!-- MAP SECTION (Leaflet) -->
      <section class="map-section">
        <div id="map-trace" class="map-container"></div>
        <div class="map-legend">
          <span class="legend-item"><span class="dot user"></span> ตำแหน่งคุณ</span>
          <span class="legend-item"><span class="dot path"></span> เส้นทางเดิน (History)</span>
          <span class="legend-item"><span class="dot route"></span> เส้นทางแนะนำ</span>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SHARED_LOCATIONS, SHARED_EDGES } from '../constants/locations';

const $q = useQuasar();

// ===== CONSTANTS & CONFIG =====
const safeLocations = [
  'สนามหญ้าจริง (Safe Zone)',
  'อาคาร 1 อาคารอำนวยการ',
  'อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร'
];

// Custom Icons
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const userIcon = L.divIcon({
  className: 'user-marker-icon',
  html: '<div class="pulse-marker"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// ===== STATE =====
const isTracking = ref(false);
const geoLoading = ref(false);
const watchId = ref(null);
const currentLocation = ref(null); // { lat, lng }
const selectedDestination = ref(null);
const autoRecenter = ref(true);

const edgeList = ref([]);
const nodesGraph = ref({}); // { name: {lat, lng} }
const graphNodeNames = computed(() => Object.keys(nodesGraph.value).sort());

// Navigation Stats
const totalStats = reactive({ distance: 0, time: 0 });
const remainingStats = reactive({ distance: 0, time: 0 });

// Map Objects
const map = ref(null);
const layers = {
  baseEdges: null,
  nodes: null,
  user: null,
  history: null,
  route: null
};

// History Trail
const userPathHistory = ref([]); // Array of [lat, lng]

// ===== LIFECYCLE =====
onMounted(() => {
  initMap();
  loadData();
});

onBeforeUnmount(() => {
  stopTracking();
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});

function getResponsiveZoom() {
  if ($q.screen.xs) return 16;
  if ($q.screen.sm) return 17;
  return 18;
}

// ===== MAP INITIALIZATION =====
function initMap() {
  if (map.value) return;

  // Center on Varee School initially with responsive zoom
  map.value = markRaw(L.map("map-trace").setView([18.758, 99.015], getResponsiveZoom()));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: 'OpenStreetMap'
  }).addTo(map.value);

  // Initialize Layer Groups
  layers.baseEdges = L.layerGroup().addTo(map.value);
  layers.nodes = L.layerGroup().addTo(map.value);
  layers.route = L.layerGroup().addTo(map.value);     // Red path
  layers.history = L.layerGroup().addTo(map.value);   // Breadcrumbs
  layers.user = L.layerGroup().addTo(map.value);      // User marker

  // Event listeners
  map.value.on('dragstart', () => {
    autoRecenter.value = false; // Disable auto-center if user pans manually
  });
}

// ===== DATA LOADING =====
async function loadData() {
  // Use shared constants as default
  const defaultEdges = SHARED_EDGES.map(edge => {
    const locA = SHARED_LOCATIONS.find(l => l.name === edge.nameA);
    const locB = SHARED_LOCATIONS.find(l => l.name === edge.nameB);
    if (!locA || !locB) return null;
    return {
      nameA: edge.nameA, latA: locA.lat, lngA: locA.lng,
      nameB: edge.nameB, latB: locB.lat, lngB: locB.lng,
      distance: edge.distance, time: edge.time
    };
  }).filter(e => e !== null);

  // ✅ Fix: Add missing connection for อาคาร 7 and สนามบาสเก็ดบอล (Isolated nodes)
  const basketballLL = SHARED_LOCATIONS.find(l => l.name === "สนามบาสเก็ดบอล");
  const building5LL = SHARED_LOCATIONS.find(l => l.name === "อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร");
  if (basketballLL && building5LL) {
    defaultEdges.push({
      nameA: building5LL.name, latA: building5LL.lat, lngA: building5LL.lng,
      nameB: basketballLL.name, latB: basketballLL.lat, lngB: basketballLL.lng,
      distance: 40, time: 1
    });
  }

  try {
    const resp = await api.get('/api/edges');
    if (resp.data && resp.data.length > 0) {
      edgeList.value = resp.data;
    } else {
      edgeList.value = defaultEdges;
    }
    if (!map.value) return; // ✅ Null check
  } catch (err) {
    console.error("Load error, using defaults", err);
    edgeList.value = defaultEdges;
    if (!map.value) return; // ✅ Null check
  }

  processGraph();
  drawBaseMap();
}

function processGraph() {
  const nodes = {};
  edgeList.value.forEach(e => {
    if (!nodes[e.nameA]) nodes[e.nameA] = { lat: Number(e.latA), lng: Number(e.lngA) };
    if (!nodes[e.nameB]) nodes[e.nameB] = { lat: Number(e.latB), lng: Number(e.lngB) };
  });
  nodesGraph.value = nodes;
}

function drawBaseMap() {
  if (!map.value) return;
  layers.baseEdges.clearLayers();
  layers.nodes.clearLayers();

  // Draw Edges (Blue)
  edgeList.value.forEach(e => {
    const polyline = L.polyline([[e.latA, e.lngA], [e.latB, e.lngB]], {
      color: '#3388ff', weight: 3, opacity: 0.6
    });
    layers.baseEdges.addLayer(polyline);
  });

  // Draw Nodes
  for (const name in nodesGraph.value) {
    const n = nodesGraph.value[name];
    const marker = L.marker([n.lat, n.lng], { icon: greenIcon })
      .bindPopup(name);
    layers.nodes.addLayer(marker);
  }
}

// ===== TRACKING LOGIC =====
function toggleTracking() {
  if (isTracking.value) {
    stopTracking();
  } else {
    startTracking();
  }
}

function startTracking() {
  if (!navigator.geolocation) {
    alert("❌ Browser ไม่รองรับ GPS");
    return;
  }

  isTracking.value = true;
  geoLoading.value = true;
  autoRecenter.value = true;

  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      geoLoading.value = false;
      const { latitude, longitude } = pos.coords;
      updateUserLocation(latitude, longitude);
    },
    (err) => {
      console.error("GPS Error", err);
      geoLoading.value = false;
      // Optional: alert('GPS Error: ' + err.message);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
}

function stopTracking() {
  isTracking.value = false;
  geoLoading.value = false;
  if (watchId.value !== null) {
    navigator.geolocation.clearWatch(watchId.value);
    watchId.value = null;
  }
}

function updateUserLocation(lat, lng) {
  currentLocation.value = { lat, lng };

  // 1. Update User Marker
  layers.user.clearLayers();
  const marker = L.marker([lat, lng], { icon: userIcon }).addTo(layers.user);

  // Accuracy circle (optional, simplified)
  // L.circle([lat, lng], { radius: 10 }).addTo(layers.user);

  // 2. Update Path History (Breadcrumbs)
  userPathHistory.value.push([lat, lng]);
  layers.history.clearLayers();
  if (userPathHistory.value.length > 1) {
    L.polyline(userPathHistory.value, {
      color: '#orange', // Orange trace
      weight: 4,
      dashArray: '5, 10',
      className: 'walking-path'
    }).addTo(layers.history);
  }

  // 3. Recenter if enabled
  if (autoRecenter.value && map.value) {
    map.value.flyTo([lat, lng], getResponsiveZoom(), { animate: true, duration: 0.5 });
  }

  // 4. Update Navigation Stats if navigating
  if (selectedDestination.value) {
    updateNavigation();
  }
}

function recenterMap() {
  if (currentLocation.value && map.value) {
    map.value.flyTo([currentLocation.value.lat, currentLocation.value.lng], getResponsiveZoom(), { animate: true, duration: 1.0 });
    autoRecenter.value = true;
  }
}

// ===== NAVIGATION LOGIC =====
function selectSafeLocation(place) {
  selectedDestination.value = place;
  onDestinationChange();
}

function onDestinationChange() {
  if (!selectedDestination.value) {
    // Clear route
    layers.route.clearLayers();
    return;
  }

  // If user has location, find route from current location
  // If not, maybe just show route from nearest node?
  // For now, let's assume we need user location for "Real-time" navigation.
  // But if user isn't tracking yet, we can't really navigate from "Current".
  // So we'll just calculate Total Distance from "Nearest Node" to Destination as a baseline.

  // Actually, let's trigger updateNavigation directly.
  totalStats.distance = 0;
  updateNavigation();
}

function updateNavigation() {
  if (!selectedDestination.value) return;

  // 1. Determine Start Node
  // If we have user location, find nearest node.
  // If not, we can't calculate "Remaining" accurately yet.

  let startNode = null;
  let distToStart = 0;

  if (currentLocation.value) {
    const nearest = findNearestNode(currentLocation.value.lat, currentLocation.value.lng);
    startNode = nearest.node;
    distToStart = nearest.distance;
  } else {
    // ✅ Fallback: Start from Building 1
    startNode = "อาคาร 1 อาคารอำนวยการ";
    distToStart = 0;
  }

  // 2. Calculate Path (Nearest Node -> Dest)
  const pathResult = calculateShortestPath(startNode, selectedDestination.value);

  if (!pathResult) return;

  // 3. Update Visuals
  drawRoute(pathResult.path, currentLocation.value);

  // 4. Update Stats
  // Total Stats (Static baseline from the initial calculation? Or dynamic?)
  // Usually "Total" is fixed from the start of the trip.
  // "Remaining" is what changes.
  // Let's set Total stats ONLY if they are 0 (first calculation).
  if (totalStats.distance === 0 || !isTracking.value) {
    totalStats.distance = Math.round(distToStart + pathResult.dist);
    totalStats.time = Math.round((distToStart + pathResult.dist) / 80);
  }

  remainingStats.distance = Math.round(distToStart + pathResult.dist);
  remainingStats.time = Math.round((distToStart + pathResult.dist) / 80); // 80m/min walking speed
}

function findNearestNode(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  // Use simple Euclidean approx for finding nearest node (Leaflet distanceTo is better)
  const userLL = L.latLng(lat, lng);

  for (const name in nodesGraph.value) {
    const n = nodesGraph.value[name];
    const nodeLL = L.latLng(n.lat, n.lng);
    const d = userLL.distanceTo(nodeLL);
    if (d < minDist) {
      minDist = d;
      nearest = name;
    }
  }
  return { node: nearest, distance: minDist };
}

function calculateShortestPath(start, end) {
  if (start === end) return { path: [start], dist: 0 };

  // 1. Build Adjacency
  const adj = {};
  for (const n in nodesGraph.value) adj[n] = [];
  edgeList.value.forEach(e => {
    adj[e.nameA].push({ node: e.nameB, weight: Number(e.distance) });
    adj[e.nameB].push({ node: e.nameA, weight: Number(e.distance) });
  });

  // 2. Dijkstra
  const dist = {};
  const prev = {};
  const visited = new Set();
  for (const n in nodesGraph.value) dist[n] = Infinity;
  dist[start] = 0;

  const pq = [{ node: start, d: 0 }];

  while (pq.length > 0) {
    // Simple shift for PQ (not efficient but fine for small graph)
    pq.sort((a, b) => a.d - b.d);
    const { node: u, d } = pq.shift();

    if (u === end) break;
    if (d > dist[u]) continue;

    if (adj[u]) {
      adj[u].forEach(neighbor => {
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = u;
          pq.push({ node: neighbor.node, d: alt });
        }
      });
    }
  }

  if (dist[end] === Infinity) return null;

  // 3. Reconstruct
  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }
  return { path, dist: dist[end] };
}

function drawRoute(path, userLoc) {
  layers.route.clearLayers();

  // Draw user -> first node (dashed) if userLoc exists
  if (userLoc && path.length > 0) {
    const startNode = nodesGraph.value[path[0]];
    L.polyline([[userLoc.lat, userLoc.lng], [startNode.lat, startNode.lng]], {
      color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.7
    }).addTo(layers.route);
  }

  // Draw path nodes
  const latlngs = path.map(name => {
    const n = nodesGraph.value[name];
    return [n.lat, n.lng];
  });

  if (latlngs.length > 1) {
    L.polyline(latlngs, {
      color: '#ef4444', weight: 6, opacity: 0.9
    }).addTo(layers.route);
  }
}
</script>

<style scoped>
/* Page Layout */
.page-wrapper {
  min-height: 100vh;
  background: #f3f4f6;
  font-family: 'Inter', sans-serif;
  color: #1f2937;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  text-align: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 0.5rem;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  margin-bottom: 2rem;
}

/* Navigation Card */
.navigation-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.nav-header {
  text-align: center;
  margin-bottom: 24px;
}

.nav-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4b5563;
  margin: 0;
}

.nav-description {
  font-size: 0.875rem;
  color: #9ca3af;
  margin-top: 4px;
}

/* Controls */
.nav-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

@media (max-width: 640px) {
  .location-input-group {
    flex-direction: column;
    align-items: stretch;
  }
}

.location-badge {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f9fafb;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.badge-icon {
  font-size: 1.5rem;
}

.badge-content {
  display: flex;
  flex-direction: column;
}

.badge-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.badge-value {
  font-size: 0.95rem;
  font-weight: 500;
  color: #111827;
}

.badge-value.empty {
  color: #9ca3af;
}

.destination-select {
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 500;
  color: #111827;
  width: 100%;
  cursor: pointer;
  outline: none;
}

/* Buttons */
.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-locate {
  background: #2563eb;
  color: white;
}

.btn-locate:hover {
  background: #1d4ed8;
}

.btn-locate.is-active {
  background: #ef4444;
}

.btn-navigate {
  background: #059669;
  color: white;
}

.btn-navigate:hover {
  background: #047857;
}

.btn-navigate:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Stats Grid */
.route-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  background: #f3f4f6;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.stat-card.highlight {
  background: #eff6ff;
  border: 2px solid #bfdbfe;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
}

.stat-sub {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Quick Access */
.quick-access {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.quick-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  display: block;
  margin-bottom: 8px;
}

.quick-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-btn {
  background: white;
  border: 1px solid #d1d5db;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}

/* Map Section */
.map-section {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.map-container {
  height: 600px;
  width: 100%;
  z-index: 1;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot.user {
  background: orange;
  border: 2px solid white;
  box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.5);
}

.dot.path {
  background: orange;
  opacity: 0.5;
}

.dot.route {
  background: #ef4444;
}

/* Global Icons */
:deep(.user-marker-icon) {
  background: transparent;
  border: none;
}

:deep(.pulse-marker) {
  width: 20px;
  height: 20px;
  background: #f97316;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  position: relative;
}

:deep(.pulse-marker::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #f97316;
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

:deep(.walking-path) {
  stroke: #f97316;
  stroke-dasharray: 10, 10;
  opacity: 0.6;
}
</style>
