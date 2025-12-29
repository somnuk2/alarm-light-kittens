<template>
  <q-page padding class="bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">
          🗺️ การนำทางไปจุดปลอดภัย
        </h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">
          โรงเรียนวารีเชียงใหม่ - ระบบนำทางแบบสด (Real-time)
        </p>

        <q-card class="full-width shadow-2 q-mb-lg" style="border-radius: 16px; overflow: hidden;">
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

          <q-card-section class="q-pa-sm q-pa-md-md">
            <div class="row q-col-gutter-md items-center">
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
                        {{ currentLocation ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` :
                          'กำลังรอสัญญาณ GPS...' }}
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

            <!-- Voice Guidance Toggle -->
            <div class="row items-center q-mt-sm justify-end">
              <div class="col-auto">
                <q-toggle v-model="voiceEnabled" color="secondary" icon="volume_up" label="เสียงนำทาง"
                  @update:model-value="onVoiceToggle" />
              </div>
            </div>

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
                <q-chip color="secondary" text-color="white" icon="directions_walk" class="q-pa-md"
                  style="height: 50px;">
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

        <!-- Navigation Instructions -->
        <q-card v-if="selectedDestination && instructions.length > 0" class="full-width shadow-2 q-mb-lg"
          style="border-radius: 16px;">
          <q-item class="bg-secondary text-white">
            <q-item-section avatar>
              <q-icon name="list" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-h6">ขั้นตอนการเดินทาง</q-item-label>
            </q-item-section>
          </q-item>
          <q-card-section class="q-pa-none">
            <q-list separator>
              <q-item v-for="(step, idx) in instructions" :key="idx" :active="idx === currentStepIndex"
                active-class="bg-blue-1 text-primary text-weight-bold">
                <q-item-section avatar>
                  <q-avatar size="32px" color="primary" text-color="white">{{ idx + 1 }}</q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ step }}</q-item-label>
                </q-item-section>
                <q-item-section side v-if="idx === currentStepIndex">
                  <q-icon name="directions_walk" color="primary" class="animate-bounce" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <q-card class="full-width relative-position shadow-2 map-container-card"
          style="border-radius: 16px; overflow: hidden;">
          <div id="map-trace" class="full-height"></div>

          <q-inner-loading :showing="isLoading">
            <q-spinner-gears size="50px" color="primary" />
            <div class="text-subtitle2 q-mt-sm">กำลังโหลดข้อมูลเส้นทาง...</div>
          </q-inner-loading>

          <div class="absolute-bottom-left q-ma-md bg-white q-pa-sm rounded-borders shadow-2 z-max"
            style="opacity: 0.9; border: 1px solid #ddd;">
            <div class="row q-gutter-sm items-center no-wrap">
              <div class="row items-center no-wrap"><q-badge rounded color="blue" class="q-mr-xs" /> คุณ</div>
              <div class="row items-center no-wrap"><q-badge rounded color="orange" class="q-mr-xs" /> รอยเท้า</div>
              <div class="row items-center no-wrap"><q-badge rounded color="red" class="q-mr-xs" /> เส้นทาง</div>
            </div>
          </div>

          <!-- Re-center Button (appears when autoRecenter is off during tracking) -->
          <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
            <q-btn v-if="isTracking && !autoRecenter" position="bottom-right" fab color="primary" icon="my_location"
              class="absolute-bottom-right q-ma-md z-max" @click="recenterMap">
              <q-tooltip>กลับไปที่ตำแหน่งปัจจุบัน</q-tooltip>
            </q-btn>
          </transition>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SHARED_LOCATIONS, SHARED_EDGES, SCHOOL_POLY, GATES } from '../constants/locations';
import { INDOOR_CENTERLINES } from '../constants/indoorCenterlines';

/* ---------- Point in Polygon Helper ---------- */

function pointInPolygon(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/* ---------- Centerline Helpers ---------- */
const INDOOR_SNAP_MAX_M = 10;

function llToXY(lat, lng, refLat) {
  const R = 6378137;
  const rad = Math.PI / 180;
  const x = lng * rad * R * Math.cos(refLat * rad);
  const y = lat * rad * R;
  return { x, y };
}

function closestPointOnSegment(A, B, P, refLat) {
  const a = llToXY(A[0], A[1], refLat);
  const b = llToXY(B[0], B[1], refLat);
  const p = llToXY(P[0], P[1], refLat);

  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;

  const ab2 = abx * abx + aby * aby || 1e-12;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));

  const x = a.x + t * abx;
  const y = a.y + t * aby;

  const rad = Math.PI / 180;
  const lat = (y / 6378137) / rad;
  const lng = (x / (6378137 * Math.cos(refLat * rad))) / rad;

  const dx = p.x - x, dy = p.y - y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return { point: [lat, lng], t, distM: dist };
}

function closestPointOnPolyline(poly, P) {
  const refLat = P[0];
  let best = null;

  for (let i = 0; i < poly.length - 1; i++) {
    const hit = closestPointOnSegment(poly[i], poly[i + 1], P, refLat);
    if (!best || hit.distM < best.distM) best = { ...hit, segIndex: i };
  }
  return best;
}

function slicePolyline(poly, projA, projB) {
  let a = projA, b = projB;
  const aPos = a.segIndex + a.t;
  const bPos = b.segIndex + b.t;
  const forward = aPos <= bPos;

  const start = forward ? a : b;
  const end = forward ? b : a;

  const out = [];
  out.push(start.point);
  for (let i = start.segIndex + 1; i <= end.segIndex; i++) {
    out.push(poly[i]);
  }
  out.push(end.point);

  return forward ? out : out.slice().reverse();
}

function buildIndoorEdgeShape(nameA, nameB) {
  const A = nodesGraph.value[nameA];
  const B = nodesGraph.value[nameB];
  if (!A || !B) return null;

  const pA = [A.lat, A.lng];
  const pB = [B.lat, B.lng];

  let best = null;
  for (const cl of INDOOR_CENTERLINES) {
    const poly = cl.points;
    if (!Array.isArray(poly) || poly.length < 2) continue;

    const projA = closestPointOnPolyline(poly, pA);
    const projB = closestPointOnPolyline(poly, pB);
    if (!projA || !projB) continue;

    if (projA.distM <= INDOOR_SNAP_MAX_M && projB.distM <= INDOOR_SNAP_MAX_M) {
      const score = projA.distM + projB.distM;
      if (!best || score < best.score) best = { score, poly, projA, projB };
    }
  }

  if (!best) return [[A.lat, A.lng], [B.lat, B.lng]];
  return slicePolyline(best.poly, best.projA, best.projB);
}

function getEdgeBetween(a, b) {
  return edgeList.value.find(e =>
    (e.nameA === a && e.nameB === b) || (e.nameA === b && e.nameB === a)
  );
}



const $q = useQuasar();

/* ---------- Helpers ---------- */
function formatTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
function safeLoadingShow(message) { $q.loading?.show?.({ message }); }
function safeLoadingHide() { $q.loading?.hide?.(); }

/* ---------- Cache ---------- */
const CACHE_KEY = 'graph_cache_live_v2';
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { markers, edges } = JSON.parse(raw);
    if (Array.isArray(markers)) markerList.value = markers;
    if (Array.isArray(edges)) edgeList.value = edges;
    return true;
  } catch { return false; }
}
function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      markers: markerList.value,
      edges: edgeList.value,
      ts: Date.now()
    }));
  } catch { }
}

/* ---------- Icons ---------- */
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const redIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
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

/* ---------- State ---------- */
const isTracking = ref(false);
const geoLoading = ref(false);
const watchId = ref(null);

const currentLocation = ref(null);
const selectedDestination = ref(null);
const autoRecenter = ref(true);

const markerList = ref([]);
const edgeList = ref([]);
const isLoading = ref(false);

/* ---------- Voice & Text Nav ---------- */
const voiceEnabled = ref(true);
const instructions = ref([]);
const currentStepIndex = ref(0);
let lastSpokenStep = -1;
const stepPoints = ref([]); // For precise turn tracking


/* ---------- nodesGraph from markers ONLY ---------- */
const nodesGraph = computed(() => {
  const nodes = {};
  markerList.value.forEach(m => {
    const lA = Number(m.lat);
    const lN = Number(m.lng);
    if (!m.name || isNaN(lA) || isNaN(lN)) return;
    nodes[m.name] = { lat: lA, lng: lN, isSafeZone: !!m.isSafeZone };
  });
  return nodes;
});

const destinationOptions = computed(() =>
  Object.keys(nodesGraph.value).sort().map(name => {
    const isSafe = nodesGraph.value[name]?.isSafeZone;
    return {
      label: isSafe ? `🚨 ${name} (จุดปลอดภัย)` : name,
      value: name,
      isSafe
    };
  })
);

/* ---------- Stats ---------- */
const totalStats = reactive({ distance: 0, time: 0 });       // time minutes
const remainingStats = reactive({ distance: 0, time: 0 });
let currentRoutePolyline = []; // Storage for current full route


/* ---------- Map + Layers ---------- */
const map = ref(null);
const layers = {
  baseEdges: null,
  nodes: null,
  user: null,
  history: null,
  route: null
};

/* ---------- Reusable Leaflet Objects (speed) ---------- */
let userMarker = null;
let historyLine = null;
let userToStartLine = null;
let routeLine = null;

function getDistFromPolyline(p, polyline) {
  if (!polyline || polyline.length < 2) return Infinity;
  const hit = closestPointOnPolyline(polyline, [p.lat, p.lng]);
  return hit ? hit.distM : Infinity;
}


const userPathHistory = ref([]);
const MAX_HISTORY_POINTS = 250;

/* ---------- Adjacency (build once when edges change) ---------- */
const adjacency = ref({});
function rebuildAdjacency() {
  const adj = {};
  for (const n in nodesGraph.value) adj[n] = [];
  edgeList.value.forEach(e => {
    if (!adj[e.nameA] || !adj[e.nameB]) return;
    const w = Number(e.distance);
    if (isNaN(w)) return;
    adj[e.nameA].push({ node: e.nameB, weight: w });
    adj[e.nameB].push({ node: e.nameA, weight: w });
  });
  adjacency.value = adj;
}
watch([nodesGraph, edgeList], () => {
  rebuildAdjacency();
});

/* ---------- Pin logic: hover shows, click pins ---------- */
let pinnedMarker = null; // Leaflet marker
let pinnedEdge = null;   // Leaflet polyline
function clearPins() {
  if (pinnedMarker) { try { pinnedMarker.closePopup(); } catch { } }
  if (pinnedEdge) { try { pinnedEdge.closeTooltip(); } catch { } }
  pinnedMarker = null;
  pinnedEdge = null;
}

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  initMap();

  const hasCache = loadCache();
  if (hasCache) drawBaseMap();

  await loadDataFast();
});

onBeforeUnmount(() => {
  stopTracking();
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
  window.removeEventListener('resize', onWindowResize);
});

function getResponsiveZoom() {
  if ($q.screen.xs) return 16;
  if ($q.screen.sm) return 17;
  return 18;
}

function initMap() {
  if (map.value) return;

  map.value = markRaw(L.map('map-trace', { preferCanvas: true }).setView([18.758, 99.015], getResponsiveZoom()));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: 'OpenStreetMap'
  }).addTo(map.value);

  layers.baseEdges = L.layerGroup().addTo(map.value);
  layers.nodes = L.layerGroup().addTo(map.value);
  layers.route = L.layerGroup().addTo(map.value);
  layers.history = L.layerGroup().addTo(map.value);
  layers.user = L.layerGroup().addTo(map.value);

  map.value.on('dragstart', () => { autoRecenter.value = false; });

  // ✅ click map clears pin
  map.value.on('click', () => { clearPins(); });

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (map.value) {
    map.value.invalidateSize();
  }
}

/* ---------- Data Loading ---------- */
function fallbackEdgesFromConstants() {
  return SHARED_EDGES.map((e, i) => ({
    id: `seed-${i}`,
    nameA: e.nameA,
    nameB: e.nameB,
    distance: Number(e.distance),
    time: Number(e.time)
  }));
}

async function loadDataFast() {
  safeLoadingShow('กำลังดึงข้อมูลนำทาง...');

  try {
    isLoading.value = true;
    const [markerResp, edgeResp] = await Promise.all([
      api.get('/api/markers'),
      api.get('/api/edges')
    ]);

    markerList.value = markerResp.data?.length ? markerResp.data : [...SHARED_LOCATIONS];

    // Ensure Gates are in markerList so Dijkstra can find them by name
    GATES.forEach(gate => {
      if (!markerList.value.find(m => m.name === gate.name)) {
        markerList.value.push({ ...gate, isSafeZone: false });
      }
    });

    edgeList.value = edgeResp.data?.length ? edgeResp.data : fallbackEdgesFromConstants();


    edgeList.value = edgeList.value.filter(e => nodesGraph.value[e.nameA] && nodesGraph.value[e.nameB]);

    // Apply automatic shapes from centerlines
    edgeList.value = edgeList.value.map(e => {
      const shape = buildIndoorEdgeShape(e.nameA, e.nameB);
      return { ...e, shape: e.shape || shape };
    });

    drawBaseMap();

    saveCache();

    if (!selectedDestination.value && destinationOptions.value.length > 0) {
      selectedDestination.value = destinationOptions.value[0].value;
    }
  } catch (e) {
    console.error(e);
    $q.notify?.({ type: 'negative', message: 'โหลดข้อมูลไม่สำเร็จ (ใช้ข้อมูลสำรอง)' });

    markerList.value = [...SHARED_LOCATIONS];
    edgeList.value = fallbackEdgesFromConstants().filter(e2 => nodesGraph.value[e2.nameA] && nodesGraph.value[e2.nameB]);

    drawBaseMap();
  } finally {
    isLoading.value = false;
    safeLoadingHide();
  }
}

/* ---------- Draw base map (hover like click + click pins) ---------- */
function drawBaseMap() {
  if (!map.value) return;

  clearPins();

  layers.baseEdges.clearLayers();
  layers.nodes.clearLayers();

  const bounds = L.latLngBounds();
  let has = false;

  // nodes
  for (const name in nodesGraph.value) {
    const n = nodesGraph.value[name];
    const isSafe = !!n.isSafeZone;
    const targetIcon = isSafe ? redIcon : greenIcon;

    const marker = L.marker([n.lat, n.lng], { icon: targetIcon })
      .bindPopup(`<b>${name}</b>${isSafe ? ' <span style="color:red">(Safe Zone)</span>' : ''}<br>Lat: ${n.lat.toFixed(6)}<br>Lng: ${n.lng.toFixed(6)}`);

    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => {
      if (pinnedMarker !== marker) marker.closePopup();
    });
    marker.on('click', () => {
      if (pinnedMarker && pinnedMarker !== marker) {
        try { pinnedMarker.closePopup(); } catch { }
      }
      pinnedMarker = marker;
      marker.openPopup();
    });

    layers.nodes.addLayer(marker);
    bounds.extend([n.lat, n.lng]);
    has = true;
  }

  // edges
  edgeList.value.forEach(e => {
    const A = nodesGraph.value[e.nameA];
    const B = nodesGraph.value[e.nameB];
    if (!A || !B) return;

    const pts = Array.isArray(e.shape) && e.shape.length >= 2
      ? e.shape
      : [[A.lat, A.lng], [B.lat, B.lng]];

    const line = L.polyline(pts, {
      color: '#3388ff',
      weight: 3,
      opacity: 0.6
    });

    line.bindTooltip(`${e.distance}ม. / ${e.time}น.`, {
      permanent: true,
      direction: 'center',
      className: 'edge-label-style'
    });

    line.on('mouseover', () => line.openTooltip());
    line.on('mouseout', () => {
      if (pinnedEdge !== line) line.closeTooltip();
    });
    line.on('click', (ev) => {
      ev?.originalEvent?.stopPropagation?.();
      if (pinnedEdge && pinnedEdge !== line) {
        try { pinnedEdge.closeTooltip(); } catch { }
      }
      pinnedEdge = line;
      line.openTooltip();
      line.bringToFront();
    });

    layers.baseEdges.addLayer(line);

    pts.forEach(p => bounds.extend(p));
    has = true;

  });

  if (has) map.value.fitBounds(bounds, { padding: [40, 40] });

  // Draw school boundary for visual reference
  L.polygon(SCHOOL_POLY, { color: '#22c55e', weight: 2, fillOpacity: 0.1, dashArray: '5, 5' }).addTo(map.value);
}

/* ---------- Tracking ---------- */
function toggleTracking() {
  if (!isTracking.value) {
    primeVoice();
  }
  isTracking.value ? stopTracking() : startTracking();
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
      console.error(err);
      geoLoading.value = false;
      $q.notify?.({ type: 'negative', message: err?.message ? `GPS Error: ${err.message}` : 'GPS Error' });
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

/* ---------- Update user location (reuse objects) ---------- */
let navThrottleTimer = null;

function updateUserLocation(lat, lng) {
  currentLocation.value = { lat, lng };

  if (!userMarker) {
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(layers.user);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  userPathHistory.value.push([lat, lng]);
  if (userPathHistory.value.length > MAX_HISTORY_POINTS) {
    userPathHistory.value.splice(0, userPathHistory.value.length - MAX_HISTORY_POINTS);
  }

  if (!historyLine) {
    historyLine = L.polyline(userPathHistory.value, { color: 'orange', weight: 4, dashArray: '5, 10' }).addTo(layers.history);
  } else {
    historyLine.setLatLngs(userPathHistory.value);
  }

  if (autoRecenter.value && map.value) {
    const center = map.value.getCenter();
    const dist = center.distanceTo([lat, lng]);

    // Only move map if user moved > 2 meters from center to prevent jitter
    if (dist > 2) {
      // Use panTo for smoother small movements, flyTo for start/large jumps
      if (dist < 100) {
        map.value.panTo([lat, lng], { animate: true, duration: 1.0, easeLinearity: 0.25 });
      } else {
        map.value.flyTo([lat, lng], getResponsiveZoom(), { animate: true, duration: 1.5 });
      }
    }
  }

  if (selectedDestination.value && map.value) {
    clearTimeout(navThrottleTimer);
    navThrottleTimer = setTimeout(() => handleNavigationTick(), 1000);
  }
}

function handleNavigationTick() {
  if (!selectedDestination.value || !currentLocation.value) return;

  const userLL = [currentLocation.value.lat, currentLocation.value.lng];
  const isIndoor = pointInPolygon(userLL[0], userLL[1], SCHOOL_POLY);
  const offRouteThreshold = isIndoor ? 25 : 50;

  const distOff = getDistFromPolyline(currentLocation.value, currentRoutePolyline);

  if (currentRoutePolyline.length === 0 || distOff > offRouteThreshold) {
    // Way off route or no route -> Full Reroute
    updateNavigation();
  } else {
    // Still on route -> Just update step tracking and stats
    updateNavigationStatusOnly();
  }
}

function updateNavigationStatusOnly() {
  if (!currentLocation.value || currentRoutePolyline.length < 2) return;

  const userLL = L.latLng(currentLocation.value.lat, currentLocation.value.lng);

  // Calculate remaining distance from user to end of polyline
  const hit = closestPointOnPolyline(currentRoutePolyline, [currentLocation.value.lat, currentLocation.value.lng]);
  let remainingD = hit.distM; // dist to nearest point on polyline

  // Add distances of segments after the hit point
  for (let i = hit.segIndex + 1; i < currentRoutePolyline.length - 1; i++) {
    const p1 = currentRoutePolyline[i];
    const p2 = currentRoutePolyline[i + 1];
    remainingD += L.latLng(p1[0], p1[1]).distanceTo(L.latLng(p2[0], p2[1]));
  }

  remainingStats.distance = Math.round(remainingD);
  remainingStats.time = Math.round(remainingD / 80);

  // Still need to call the tracking part of generateInstructions logic
  trackStepProgress(userLL);
}

function trackStepProgress(userLL) {
  if (stepPoints.value.length === 0) return;

  let bestStep = currentStepIndex.value;
  const threshold = pointInPolygon(userLL.lat, userLL.lng, SCHOOL_POLY) ? 10 : 25;

  for (let i = currentStepIndex.value; i < stepPoints.value.length; i++) {
    const pt = stepPoints.value[i];
    if (!pt) continue;
    const d = userLL.distanceTo(L.latLng(pt[0], pt[1]));
    if (d < threshold) {
      bestStep = i + 1;
    }
  }

  if (bestStep > currentStepIndex.value) {
    currentStepIndex.value = Math.min(bestStep, instructions.value.length - 1);
  }

  if (voiceEnabled.value && lastSpokenStep !== currentStepIndex.value) {
    const textToSpeak = instructions.value[currentStepIndex.value];
    if (textToSpeak) speakInstruction(textToSpeak);
    lastSpokenStep = currentStepIndex.value;
  }
}


function recenterMap() {
  if (currentLocation.value && map.value) {
    map.value.flyTo([currentLocation.value.lat, currentLocation.value.lng], getResponsiveZoom(), { animate: true, duration: 1.0 });
    autoRecenter.value = true;
  }
}

function onDestinationChange() {
  totalStats.distance = 0;
  totalStats.time = 0;
  remainingStats.distance = 0;
  remainingStats.time = 0;

  if (userToStartLine) { layers.route.removeLayer(userToStartLine); userToStartLine = null; }
  if (routeLine) { layers.route.removeLayer(routeLine); routeLine = null; }

  currentStepIndex.value = 0;
  lastSpokenStep = -1;

  if (selectedDestination.value) {
    currentRoutePolyline = []; // Reset to force reroute
    updateNavigation();
  }
}


async function updateNavigation() {
  if (!selectedDestination.value || !currentLocation.value) return;

  isLoading.value = true;
  try {
    const res = await buildRouteHybrid(currentLocation.value, selectedDestination.value);
    if (!res) {
      $q.notify?.({ type: 'warning', message: 'ไม่พบเส้นทางไปยังจุดหมาย' });
      return;
    }

    drawRoutePolyline(res.polyline, currentLocation.value, res.polyline[0]);
    currentRoutePolyline = res.polyline;

    totalStats.distance = Math.round(res.totalDistance);

    totalStats.time = Math.round(res.totalTime);
    remainingStats.distance = Math.round(res.totalDistance);
    remainingStats.time = Math.round(res.totalTime);

    instructions.value = res.instructions || [];
    stepPoints.value = res.stepPoints || [];
    currentStepIndex.value = 0;
    lastSpokenStep = -1;

    // Initial voice instruction
    if (voiceEnabled.value && instructions.value.length > 0) {
      speakInstruction(instructions.value[0]);
      lastSpokenStep = 0;
    }
  } catch (err) {
    console.error(err);
    $q.notify?.({ type: 'negative', message: 'เกิดข้อผิดพลาดในการคำนวณเส้นทาง' });
  } finally {
    isLoading.value = false;
  }
}

async function buildRouteHybrid(userLL, destination) {
  const userInside = pointInPolygon(userLL.lat, userLL.lng, SCHOOL_POLY);
  const destNode = nodesGraph.value[destination];
  if (!destNode) return null;

  // Determine if destination is indoor/outdoor based on its position in SCHOOL_POLY
  const destIsIndoor = pointInPolygon(destNode.lat, destNode.lng, SCHOOL_POLY);
  const destInfo = { lat: destNode.lat, lng: destNode.lng, isIndoor: destIsIndoor };

  // 1) indoor->indoor
  if (userInside && destInfo.isIndoor) {
    return buildIndoorRoute(userLL, destination);
  }

  // 2) outdoor->outdoor
  if (!userInside && !destInfo.isIndoor) {
    return await buildOutdoorRoute(userLL, destInfo);
  }


  // 3) in->out or out->in : stitch via best gate
  let best = null;
  for (const gate of GATES) {
    const gateLL = { lat: gate.lat, lng: gate.lng };

    const indoorPart = userInside
      ? buildIndoorRoute(userLL, gate.name)       // user -> gate
      : buildIndoorRoute(gateLL, destination);    // gate -> indoor dest

    const outdoorPart = userInside
      ? await buildOutdoorRoute(gateLL, destInfo) // gate -> outdoor dest
      : await buildOutdoorRoute(userLL, gateLL);  // user -> gate

    if (!indoorPart || !outdoorPart) continue;

    const merged = mergeRoutes(userInside ? indoorPart : outdoorPart, userInside ? outdoorPart : indoorPart);
    if (!best || merged.totalTime < best.totalTime) best = merged;
  }

  return best;
}

function buildIndoorRoute(fromLL, toName) {
  // Find nearest node to start if fromLL is coordinates
  const nearest = findNearestNode(fromLL.lat, fromLL.lng);
  const startNode = nearest.node;
  const distToStart = nearest.distance;

  const res = dijkstra(startNode, toName);
  if (!res) return null;

  const polyline = updateNavigationPolyline(res.path);
  // Add current location as connector point if needed
  if (distToStart > 5) {
    polyline.unshift([fromLL.lat, fromLL.lng]);
  }

  const steps = [];
  if (distToStart > 10) {
    steps.push(`เดินไปที่จุดเริ่มต้น: ${res.path[0]}`);
  }
  for (let i = 0; i < res.path.length - 1; i++) {
    steps.push(`จาก ${res.path[i]} เดินต่อไปยัง ${res.path[i + 1]}`);
  }

  return {
    polyline,
    instructions: steps,
    stepPoints: polyline,
    totalDistance: distToStart + res.dist,
    totalTime: (distToStart + res.dist) / 80 // minutes
  };
}


async function buildOutdoorRoute(fromLL, toLL) {
  if (!fromLL || !toLL) return null;
  try {
    const { data } = await api.post('/api/route/osrm', {
      profile: 'driving',
      from: fromLL,
      to: toLL
    });
    return data;
  } catch (err) {
    console.error('Outdoor route failed:', err);
    return null;
  }
}

function mergeRoutes(a, b) {
  const polyline = [];
  const pushSeg = (seg) => {
    if (!seg?.length) return;
    if (!polyline.length) { polyline.push(...seg); return; }
    const last = polyline[polyline.length - 1];
    const first = seg[0];
    // Avoid duplicate point at stitch
    if (Math.abs(last[0] - first[0]) < 0.00001 && Math.abs(last[1] - first[1]) < 0.00001) {
      polyline.push(...seg.slice(1));
    } else {
      polyline.push(...seg);
    }
  };

  pushSeg(a.polyline);
  pushSeg(b.polyline);

  return {
    polyline,
    instructions: [...(a.instructions || []), 'เดินออกไปนอกเขต', ...(b.instructions || [])],
    stepPoints: [...(a.stepPoints || []), ...(b.stepPoints || [])],
    totalDistance: (a.totalDistance || 0) + (b.totalDistance || 0),
    totalTime: (a.totalTime || 0) + (b.totalTime || 0),
  };
}


function generateInstructions(path, distToStart) {
  if (!path || path.length === 0) {
    instructions.value = [];
    return;
  }

  const steps = [];
  const waypoints = []; // LatLngs of nodes in path

  if (distToStart > 12) {
    steps.push(`เดินไปที่จุดเริ่มต้น: ${path[0]}`);
    waypoints.push(null); // start point is current location or handled differently
  }

  for (let i = 0; i < path.length - 1; i++) {
    steps.push(`จาก ${path[i]} เดินต่อไปยัง ${path[i + 1]}`);
    const node = nodesGraph.value[path[i + 1]];
    waypoints.push(node ? L.latLng(node.lat, node.lng) : null);
  }

  const endNode = nodesGraph.value[path[path.length - 1]];
  steps.push(`คุณถึงที่หมายแล้ว: ${path[path.length - 1]}`);
  waypoints.push(endNode ? L.latLng(endNode.lat, endNode.lng) : null);

  instructions.value = steps;

  // Speak if step changed (handled in trackStepProgress now)
}



function onVoiceToggle(val) {
  if (val) {
    primeVoice();
    speakInstruction('ระบบนำทางด้วยเสียงเปิดใช้งานแล้ว');
  }
}

/**
 * Browsers (especially mobile Safari/Chrome) block speech until a user gesture.
 * This "primes" the engine with a silent utterance.
 */
function primeVoice() {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
}

function speakInstruction(text) {
  if (!voiceEnabled.value) return;
  if (!window.speechSynthesis) return;

  // Cancel previous speech to stay current
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'th-TH';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a Thai voice explicitly (improves reliability on some mobiles)
  const voices = window.speechSynthesis.getVoices();
  const thaiVoice = voices.find(v => v.lang.includes('th') || v.lang.includes('TH'));
  if (thaiVoice) {
    utterance.voice = thaiVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function findNearestNode(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  const userLL = L.latLng(lat, lng);

  for (const name in nodesGraph.value) {
    const n = nodesGraph.value[name];
    const d = userLL.distanceTo(L.latLng(n.lat, n.lng));
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return { node: nearest, distance: minDist };
}

function dijkstra(start, end) {
  if (!adjacency.value[start] || !adjacency.value[end]) return null;
  if (start === end) return { path: [start], dist: 0 };

  const dist = {};
  const prev = {};
  const visited = new Set();
  for (const n in adjacency.value) dist[n] = Infinity;
  dist[start] = 0;

  const pq = [{ node: start, d: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const { node: u, d } = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;

    (adjacency.value[u] || []).forEach(nb => {
      const alt = d + nb.weight;
      if (alt < dist[nb.node]) {
        dist[nb.node] = alt;
        prev[nb.node] = u;
        pq.push({ node: nb.node, d: alt });
      }
    });
  }

  if (dist[end] === Infinity) return null;

  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return { path, dist: dist[end] };
}

function updateNavigationPolyline(path) {
  const latlngs = [];

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const e = getEdgeBetween(a, b);
    const A = nodesGraph.value[a], B = nodesGraph.value[b];
    if (!A || !B) continue;

    let seg = (e?.shape && e.shape.length >= 2)
      ? e.shape
      : [[A.lat, A.lng], [B.lat, B.lng]];

    // Make sure segment direction is a -> b
    const first = seg[0], last = seg[seg.length - 1];
    const userLL = L.latLng(A.lat, A.lng);
    const dFirstToA = userLL.distanceTo(L.latLng(first[0], first[1]));
    const dLastToA = userLL.distanceTo(L.latLng(last[0], last[1]));
    if (dLastToA < dFirstToA) seg = [...seg].reverse();

    // Stitch segments together avoiding duplicate points
    if (latlngs.length) {
      const prev = latlngs[latlngs.length - 1];
      const cur0 = seg[0];
      if (Math.abs(prev[0] - cur0[0]) < 0.00001 && Math.abs(prev[1] - cur0[1]) < 0.00001) {
        latlngs.push(...seg.slice(1));
      } else {
        latlngs.push(...seg);
      }
    } else {
      latlngs.push(...seg);
    }
  }

  return latlngs;
}

function drawRoutePolyline(latlngs, userLoc, startLL) {
  if (!latlngs?.length) return;

  // เส้นประจาก user ไปจุดเริ่มต้นของ polyline
  if (userLoc && startLL) {
    const dashed = [[userLoc.lat, userLoc.lng], [startLL[0], startLL[1]]];
    if (!userToStartLine) {
      userToStartLine = L.polyline(dashed, { color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.7 })
        .addTo(layers.route);
    } else userToStartLine.setLatLngs(dashed);
  }

  if (!routeLine) {
    routeLine = L.polyline(latlngs, { color: '#ef4444', weight: 6, opacity: 0.9 }).addTo(layers.route);
  } else {
    routeLine.setLatLngs(latlngs);
  }
}

</script>

<style scoped>
:deep(.edge-label-style) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #3388ff;
  color: #3388ff;
  font-size: 11px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  z-index: 1000;
}

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

.animate-bounce {
  animation: bounce 1s infinite;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }

  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

.main-card-width {
  max-width: 900px;
}

@media (max-width: 600px) {
  .main-card-width {
    max-width: 100%;
    border-radius: 0 !important;
  }
}

.map-container-card {
  height: clamp(400px, 70vh, 750px);
}

.opacity-80 {
  opacity: 0.8;
}
</style>
