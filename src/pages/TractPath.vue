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
import { SHARED_LOCATIONS, SHARED_EDGES } from '../constants/locations';

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
    edgeList.value = edgeResp.data?.length ? edgeResp.data : fallbackEdgesFromConstants();

    edgeList.value = edgeList.value.filter(e => nodesGraph.value[e.nameA] && nodesGraph.value[e.nameB]);

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

    const line = L.polyline([[A.lat, A.lng], [B.lat, B.lng]], {
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

    bounds.extend([A.lat, A.lng]);
    bounds.extend([B.lat, B.lng]);
    has = true;
  });

  if (has) map.value.fitBounds(bounds, { padding: [40, 40] });
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
    map.value.flyTo([lat, lng], getResponsiveZoom(), { animate: true, duration: 0.5 });
  }

  if (selectedDestination.value) {
    clearTimeout(navThrottleTimer);
    navThrottleTimer = setTimeout(() => updateNavigation(), 900);
  }
}

function recenterMap() {
  if (currentLocation.value && map.value) {
    map.value.flyTo([currentLocation.value.lat, currentLocation.value.lng], getResponsiveZoom(), { animate: true, duration: 1.0 });
    autoRecenter.value = true;
  }
}

/* ---------- Navigation ---------- */
function onDestinationChange() {
  totalStats.distance = 0;
  totalStats.time = 0;
  remainingStats.distance = 0;
  remainingStats.time = 0;

  if (userToStartLine) { layers.route.removeLayer(userToStartLine); userToStartLine = null; }
  if (routeLine) { layers.route.removeLayer(routeLine); routeLine = null; }

  currentStepIndex.value = 0;
  lastSpokenStep = -1;

  if (selectedDestination.value) updateNavigation();
}

function updateNavigation() {
  if (!selectedDestination.value) return;

  let startNode = null;
  let distToStart = 0;

  if (currentLocation.value) {
    const nearest = findNearestNode(currentLocation.value.lat, currentLocation.value.lng);
    startNode = nearest.node;
    distToStart = nearest.distance;
  } else {
    startNode = Object.keys(nodesGraph.value).sort()[0] || null;
    distToStart = 0;
  }

  if (!startNode) return;

  const res = dijkstra(startNode, selectedDestination.value);
  if (!res) {
    $q.notify?.({ type: 'warning', message: 'ไม่พบเส้นทางไปยังจุดหมาย' });
    return;
  }

  drawRoute(res.path, currentLocation.value);

  const totalDistance = distToStart + res.dist;
  const totalTimeMin = totalDistance / 80;

  if (totalStats.distance === 0 || !isTracking.value) {
    totalStats.distance = Math.round(totalDistance);
    totalStats.time = Math.round(totalTimeMin);
  }

  remainingStats.distance = Math.round(totalDistance);
  remainingStats.time = Math.round(totalTimeMin);

  generateInstructions(res.path, distToStart);
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

  // Real-time tracking of current step
  if (currentLocation.value) {
    const userLL = L.latLng(currentLocation.value.lat, currentLocation.value.lng);
    let bestStep = 0;

    // Find the furthest waypoint we are "at" or the next one we are heading to
    for (let i = 0; i < waypoints.length; i++) {
      if (!waypoints[i]) continue;
      const d = userLL.distanceTo(waypoints[i]);
      if (d < 10) { // If within 10 meters of a node
        bestStep = i + 1;
      }
    }

    // Ensure we don't go backwards in instruction tracking
    if (bestStep > currentStepIndex.value) {
      currentStepIndex.value = Math.min(bestStep, steps.length - 1);
    }
  }

  // Speak if step changed
  if (voiceEnabled.value && lastSpokenStep !== currentStepIndex.value) {
    const textToSpeak = steps[currentStepIndex.value];
    if (textToSpeak) speakInstruction(textToSpeak);
    lastSpokenStep = currentStepIndex.value;
  }
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

function drawRoute(path, userLoc) {
  if (!path?.length) return;

  if (userLoc && nodesGraph.value[path[0]]) {
    const startNode = nodesGraph.value[path[0]];
    const dashed = [[userLoc.lat, userLoc.lng], [startNode.lat, startNode.lng]];

    if (!userToStartLine) {
      userToStartLine = L.polyline(dashed, { color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.7 }).addTo(layers.route);
    } else {
      userToStartLine.setLatLngs(dashed);
    }
  }

  const latlngs = path
    .map(name => nodesGraph.value[name])
    .filter(Boolean)
    .map(n => [n.lat, n.lng]);

  if (latlngs.length > 1) {
    if (!routeLine) {
      routeLine = L.polyline(latlngs, { color: '#ef4444', weight: 6, opacity: 0.9 }).addTo(layers.route);
    } else {
      routeLine.setLatLngs(latlngs);
    }
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
