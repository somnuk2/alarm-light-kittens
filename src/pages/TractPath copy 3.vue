<template>
  <q-page padding class="bg-grey-2">
    <div class="column q-gutter-md items-center full-width">
      <div class="text-center q-mb-md">
        <div class="text-h4 text-weight-bold">🗺️ การนำทางไปจุดปลอดภัย</div>
        <div class="text-subtitle1 text-grey-7">โรงเรียนวารีเชียงใหม่ - ระบบนำทางแบบสด (Real-time)</div>
      </div>

      <!-- Main Navigation Control Card -->
      <q-card class="full-width" style="max-width: 900px; border-radius: 16px; overflow: hidden;">
        <q-item class="bg-primary text-white q-py-md">
          <q-item-section avatar>
            <q-icon name="explore" size="md" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-h6">ระบบนำทางอัจฉริยะ</q-item-label>
            <q-item-label caption class="text-white opacity-80">
              ติดตามตำแหน่งและนำทางไปยังจุดที่สั้นที่สุด
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-card-section class="q-pa-md">
          <div class="row q-col-gutter-md items-center">
            <!-- Tracking Status & Control -->
            <div class="col-12 col-sm-6">
              <q-card flat bordered class="bg-grey-1" style="border-radius: 12px;">
                <q-item>
                  <q-item-section avatar>
                    <q-icon :name="isTracking ? 'directions_run' : 'location_off'"
                      :color="isTracking ? 'positive' : 'grey-6'" size="md" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">สถานะการติดตาม</q-item-label>
                    <q-item-label caption v-if="isTracking" class="text-positive">
                      {{
                        currentLocation
                          ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
                          : 'กำลังรอสัญญาณ GPS...'
                      }}
                    </q-item-label>
                    <q-item-label caption v-else>ไม่ได้ติดตามตำแหน่ง</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn :color="isTracking ? 'negative' : 'primary'" :label="isTracking ? 'หยุด' : 'เริ่ม'"
                      :loading="geoLoading" rounded unelevated @click="toggleTracking" />
                  </q-item-section>
                </q-item>
              </q-card>
            </div>

            <!-- Destination Selection -->
            <div class="col-12 col-sm-6">
              <q-select v-model="selectedDestination" :options="destinationOptions" emit-value map-options
                label="🎯 เลือกจุดหมายปลายทาง" outlined dense bg-color="white"
                :disable="destinationOptions.length === 0" @update:model-value="onDestinationChange">
                <template #prepend>
                  <q-icon name="place" color="secondary" />
                </template>
                <template #append>
                  <q-btn v-if="currentLocation" flat round dense icon="my_location" @click.stop="recenterMap">
                    <q-tooltip>ตำแหน่งคุณ</q-tooltip>
                  </q-btn>
                </template>
              </q-select>
            </div>
          </div>

          <!-- Live Stats Chips -->
          <div v-if="selectedDestination" class="row q-col-gutter-sm justify-center q-mt-md">
            <div class="col-auto">
              <q-chip outline color="primary" icon="straighten" class="q-pa-md" style="height: 50px;">
                <div class="column items-center">
                  <div class="text-caption text-weight-bold">ระยะทางทั้งหมด</div>
                  <div class="text-subtitle1">
                    {{ totalStats.distance }} ม. ({{ formatTime(totalStats.time * 60) }})
                  </div>
                </div>
              </q-chip>
            </div>
            <div class="col-auto">
              <q-chip color="secondary" text-color="white" icon="directions_walk" class="q-pa-md" style="height: 50px;">
                <div class="column items-center">
                  <div class="text-caption text-weight-bold">เหลืออีก</div>
                  <div class="text-subtitle1">
                    {{ remainingStats.distance }} ม. ({{ formatTime(remainingStats.time * 60) }})
                  </div>
                </div>
              </q-chip>
            </div>
          </div>

        </q-card-section>
      </q-card>

      <!-- Map Container Card -->
      <q-card class="full-width" style="max-width: 900px; border-radius: 16px; overflow: hidden; height: 500px;">
        <div id="map-trace" class="full-height"></div>

        <!-- Legend Overlay -->
        <div class="absolute-bottom-left q-ma-md bg-white q-pa-sm rounded-borders shadow-2 z-max"
          style="opacity: 0.9; border: 1px solid #ddd;">
          <div class="row q-gutter-sm items-center no-wrap">
            <div class="row items-center no-wrap"><q-badge rounded color="blue" class="q-mr-xs" /> คุณ</div>
            <div class="row items-center no-wrap"><q-badge rounded color="orange" class="q-mr-xs" /> รอยเท้า</div>
            <div class="row items-center no-wrap"><q-badge rounded color="red" class="q-mr-xs" /> เส้นทาง</div>
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SHARED_LOCATIONS, SHARED_EDGES } from '../constants/locations';

const $q = useQuasar();

// ---------- Helpers ----------
function formatTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
function safeLoadingShow(message) {
  $q.loading?.show?.({ message });
}
function safeLoadingHide() {
  $q.loading?.hide?.();
}

// ---------- Leaflet Icons ----------
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

const markerList = ref([]); // from /api/markers
const edgeList = ref([]);   // from /api/edges

// ✅ nodesGraph สร้างจาก markerList เท่านั้น (Single source of truth)
const nodesGraph = computed(() => {
  const nodes = {};
  markerList.value.forEach(m => {
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    if (!m.name || isNaN(lat) || isNaN(lng)) return;
    nodes[m.name] = { lat, lng };
  });
  return nodes;
});

// ✅ options สำหรับปลายทาง
const destinationOptions = computed(() =>
  Object.keys(nodesGraph.value)
    .sort()
    .map(name => ({ label: name, value: name }))
);

// Navigation Stats
const totalStats = reactive({ distance: 0, time: 0 });       // time: minutes
const remainingStats = reactive({ distance: 0, time: 0 });   // time: minutes

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
const MAX_HISTORY_POINTS = 250;

// ===== LIFECYCLE =====
onMounted(async () => {
  initMap();
  await loadData();
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

  map.value = markRaw(L.map("map-trace").setView([18.758, 99.015], getResponsiveZoom()));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: 'OpenStreetMap'
  }).addTo(map.value);

  layers.baseEdges = L.layerGroup().addTo(map.value);
  layers.nodes = L.layerGroup().addTo(map.value);
  layers.route = L.layerGroup().addTo(map.value);
  layers.history = L.layerGroup().addTo(map.value);
  layers.user = L.layerGroup().addTo(map.value);

  map.value.on('dragstart', () => {
    autoRecenter.value = false;
  });
}

// ===== DATA LOADING (DB first, fallback) =====
function fallbackEdgesFromConstants() {
  // ✅ fallback edges: เก็บเฉพาะ nameA/nameB/distance/time
  return SHARED_EDGES.map((e, idx) => ({
    id: `seed-${idx}`,
    nameA: e.nameA,
    nameB: e.nameB,
    distance: Number(e.distance),
    time: Number(e.time)
  }));
}

async function loadData() {
  safeLoadingShow('กำลังดึงข้อมูลนำทาง...');

  try {
    // 1) markers
    const markerResp = await api.get('/api/markers');
    markerList.value = (markerResp.data?.length ? markerResp.data : [...SHARED_LOCATIONS]);

    // 2) edges
    const edgeResp = await api.get('/api/edges');
    edgeList.value = (edgeResp.data?.length ? edgeResp.data : fallbackEdgesFromConstants());

    // ✅ cleanup: ตัด edges ที่อ้าง node ที่ไม่มีใน markers DB
    const before = edgeList.value.length;
    edgeList.value = edgeList.value.filter(e => nodesGraph.value[e.nameA] && nodesGraph.value[e.nameB]);
    const removed = before - edgeList.value.length;
    if (removed > 0) {
      $q.notify?.({ type: 'warning', message: `ตัดเส้นทางที่อ้างอิงสถานที่ที่ไม่มีใน Markers ออกแล้ว ${removed} รายการ` });
    }

    drawBaseMap();

    // ตั้งค่าเริ่มต้น destination ถ้ายังไม่เลือก
    if (!selectedDestination.value && destinationOptions.value.length > 0) {
      selectedDestination.value = destinationOptions.value[0].value;
    }

  } catch (err) {
    console.error("Load error, using defaults", err);

    markerList.value = [...SHARED_LOCATIONS];
    edgeList.value = fallbackEdgesFromConstants()
      .filter(e => nodesGraph.value[e.nameA] && nodesGraph.value[e.nameB]);

    drawBaseMap();

    $q.notify?.({ type: 'negative', message: 'ไม่สามารถดึงข้อมูลจาก Server ได้ (ใช้ข้อมูลสำรอง)' });
  } finally {
    safeLoadingHide();
  }
}

function drawBaseMap() {
  if (!map.value) return;

  layers.baseEdges.clearLayers();
  layers.nodes.clearLayers();

  const bounds = L.latLngBounds();
  let hasAnything = false;

  // ✅ Draw Nodes from markers DB
  for (const name in nodesGraph.value) {
    const n = nodesGraph.value[name];
    const marker = L.marker([n.lat, n.lng], { icon: greenIcon }).bindPopup(name);
    layers.nodes.addLayer(marker);
    bounds.extend([n.lat, n.lng]);
    hasAnything = true;
  }

  // ✅ Draw Edges using coords from markers DB (ignore edge lat/lng)
  edgeList.value.forEach(e => {
    const A = nodesGraph.value[e.nameA];
    const B = nodesGraph.value[e.nameB];
    if (!A || !B) return;

    const polyline = L.polyline([[A.lat, A.lng], [B.lat, B.lng]], {
      color: '#3388ff',
      weight: 3,
      opacity: 0.6
    });

    layers.baseEdges.addLayer(polyline);
    bounds.extend([A.lat, A.lng]);
    bounds.extend([B.lat, B.lng]);
    hasAnything = true;
  });

  if (hasAnything) {
    map.value.fitBounds(bounds, { padding: [40, 40] });
  }
}

// ===== TRACKING LOGIC =====
function toggleTracking() {
  if (isTracking.value) stopTracking();
  else startTracking();
}

function startTracking() {
  if (!navigator.geolocation) {
    $q.notify?.({ type: 'negative', message: "❌ Browser ไม่รองรับ GPS" });
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

      $q.notify?.({
        type: 'negative',
        message: err?.message ? `GPS Error: ${err.message}` : 'GPS Error'
      });
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
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

  // 1) User marker
  layers.user.clearLayers();
  L.marker([lat, lng], { icon: userIcon }).addTo(layers.user);

  // 2) Path history (limit growth)
  userPathHistory.value.push([lat, lng]);
  if (userPathHistory.value.length > MAX_HISTORY_POINTS) {
    userPathHistory.value.splice(0, userPathHistory.value.length - MAX_HISTORY_POINTS);
  }

  layers.history.clearLayers();
  if (userPathHistory.value.length > 1) {
    L.polyline(userPathHistory.value, {
      color: 'orange',
      weight: 4,
      dashArray: '5, 10'
    }).addTo(layers.history);
  }

  // 3) Auto recenter
  if (autoRecenter.value && map.value) {
    map.value.flyTo([lat, lng], getResponsiveZoom(), { animate: true, duration: 0.5 });
  }

  // 4) Update navigation
  if (selectedDestination.value) updateNavigation();
}

function recenterMap() {
  if (currentLocation.value && map.value) {
    map.value.flyTo([currentLocation.value.lat, currentLocation.value.lng], getResponsiveZoom(), {
      animate: true,
      duration: 1.0
    });
    autoRecenter.value = true;
  }
}

// ===== NAVIGATION LOGIC =====
function onDestinationChange() {
  layers.route.clearLayers();
  totalStats.distance = 0;
  totalStats.time = 0;
  remainingStats.distance = 0;
  remainingStats.time = 0;

  if (selectedDestination.value) updateNavigation();
}

function updateNavigation() {
  if (!selectedDestination.value) return;

  // start node = nearest node from markers DB
  let startNode = null;
  let distToStart = 0;

  if (currentLocation.value) {
    const nearest = findNearestNode(currentLocation.value.lat, currentLocation.value.lng);
    startNode = nearest.node;
    distToStart = nearest.distance;
  } else {
    // fallback: first node in markers
    startNode = Object.keys(nodesGraph.value).sort()[0] || null;
    distToStart = 0;
  }

  if (!startNode) return;

  const pathResult = calculateShortestPath(startNode, selectedDestination.value);
  if (!pathResult) {
    layers.route.clearLayers();
    $q.notify?.({ type: 'warning', message: 'ไม่พบเส้นทางไปยังจุดหมาย' });
    return;
  }

  drawRoute(pathResult.path, currentLocation.value);

  // Total distance: initial distance to nearest node + graph distance
  const totalDistance = distToStart + pathResult.dist;
  const totalTimeMin = totalDistance / 80; // 80m/min

  // totalStats ตั้งครั้งแรก หรือเมื่อไม่ได้ tracking
  if (totalStats.distance === 0 || !isTracking.value) {
    totalStats.distance = Math.round(totalDistance);
    totalStats.time = Math.round(totalTimeMin);
  }

  remainingStats.distance = Math.round(totalDistance);
  remainingStats.time = Math.round(totalTimeMin);
}

function findNearestNode(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
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
  if (!nodesGraph.value[start] || !nodesGraph.value[end]) return null;
  if (start === end) return { path: [start], dist: 0 };

  // adjacency list from edges (weight = distance)
  const adj = {};
  for (const n in nodesGraph.value) adj[n] = [];

  edgeList.value.forEach(e => {
    if (!adj[e.nameA] || !adj[e.nameB]) return;
    const w = Number(e.distance);
    if (isNaN(w)) return;
    adj[e.nameA].push({ node: e.nameB, weight: w });
    adj[e.nameB].push({ node: e.nameA, weight: w });
  });

  const dist = {};
  const prev = {};
  for (const n in nodesGraph.value) dist[n] = Infinity;
  dist[start] = 0;

  // simple PQ
  const pq = [{ node: start, d: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { node: u, d } = pq.shift();
    if (u === end) break;
    if (d > dist[u]) continue;

    (adj[u] || []).forEach(nb => {
      const alt = dist[u] + nb.weight;
      if (alt < dist[nb.node]) {
        dist[nb.node] = alt;
        prev[nb.node] = u;
        pq.push({ node: nb.node, d: alt });
      }
    });
  }

  if (dist[end] === Infinity) return null;

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
  if (!path || path.length === 0) return;

  // dashed line from user to nearest node in path
  if (userLoc && nodesGraph.value[path[0]]) {
    const startNode = nodesGraph.value[path[0]];
    L.polyline([[userLoc.lat, userLoc.lng], [startNode.lat, startNode.lng]], {
      color: '#ef4444',
      weight: 4,
      dashArray: '10, 10',
      opacity: 0.7
    }).addTo(layers.route);
  }

  const latlngs = path
    .map(name => nodesGraph.value[name])
    .filter(Boolean)
    .map(n => [n.lat, n.lng]);

  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#ef4444', weight: 6, opacity: 0.9 }).addTo(layers.route);
  }
}
</script>

<style scoped>
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

.opacity-80 {
  opacity: 0.8;
}
</style>
