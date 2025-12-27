<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">
          กำหนดเส้นทางสั้นที่สุดไปจุดปลอดภัย
        </h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">
          โรงเรียนวารีเชียงใหม่ - วิเคราะห์เส้นทางเดินที่สั้นที่สุดบนแผนที่จริง
        </p>

        <div class="row q-col-gutter-lg">
          <!-- Map -->
          <div class="col-12">
            <q-card class="my-card q-mb-lg fit">
              <q-card-section class="q-pb-none">
                <div class="text-h6 text-primary flex items-center">
                  <q-icon name="map" class="q-mr-sm" />
                  แผนที่นําทาง (LeafletJS Map)
                </div>
                <div class="text-caption text-grey">
                  เส้นสีน้ำเงิน = เส้นทางปกติ | เส้นสีแดง = เส้นทางที่สั้นที่สุด
                </div>
              </q-card-section>

              <q-card-section>
                <div id="map-path" class="rounded-borders shadow-1" style="height: 650px; width: 100%; z-index: 1;" />
              </q-card-section>

              <q-separator />
              <q-card-section class="bg-blue-1">
                <div class="text-subtitle1 text-primary text-weight-bold">
                  🎬 คำนวณหาเส้นทางสั้นที่สุด (Dijkstra Algorithm)
                </div>

                <div class="row q-col-gutter-md q-mt-xs items-center">
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcStart" :options="graphNodeOptions" label="จุดเริ่มต้น" outlined dense
                      bg-color="white" :disable="graphNodeOptions.length === 0" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcEnd" :options="graphNodeOptions" label="จุดปลายทาง" outlined dense
                      bg-color="white" :disable="graphNodeOptions.length === 0" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcWeight" :options="[
                      { label: 'ระยะทาง (เมตร)', value: 'distance' },
                      { label: 'เวลา (นาที)', value: 'time' }
                    ]" emit-value map-options label="เกณฑ์คำนวณ" outlined dense bg-color="white" />
                  </div>
                </div>

                <div class="q-mt-md text-center">
                  <q-btn unelevated color="primary" icon="search" label="คำนวณเส้นทาง" @click="runCalculation"
                    class="full-width-sm" :disable="graphNodeOptions.length < 2 || edgeList.length === 0" />
                </div>

                <div v-if="result.visible" class="q-mt-md q-pa-md bg-white rounded-borders shadow-1">
                  <div class="text-subtitle1 text-center">
                    เส้นทางที่สั้นที่สุดจาก <strong>{{ result.start }}</strong> ไป <strong>{{ result.end }}</strong>
                  </div>
                  <div class="text-body2 q-my-xs text-grey-8 text-center">
                    เส้นทาง: {{ result.path.join(' → ') }}
                  </div>

                  <div class="row q-col-gutter-sm justify-center q-mt-sm">
                    <div class="col-auto">
                      <q-chip outline color="primary" icon="straighten">
                        ระยะทางรวม: {{ result.totalDistance }} เมตร
                      </q-chip>
                    </div>
                    <div class="col-auto">
                      <q-chip outline color="secondary" icon="schedule">
                        เวลาเดินรวม: {{ result.totalTimeFormatted }}
                      </q-chip>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Edge Form -->
          <div class="col-12">
            <q-card class="my-card h-full">
              <q-card-section>
                <div class="text-h6 text-primary flex items-center q-mb-md">
                  <q-icon name="edit_road" class="q-mr-sm" />
                  จัดการข้อมูลเส้นทาง (Edge Data)
                </div>

                <div class="row q-col-gutter-md">
                  <!-- A -->
                  <div class="col-12 col-md-6">
                    <q-card flat bordered class="bg-blue-grey-1 h-full">
                      <q-card-section class="q-pt-sm q-pb-sm">
                        <div class="text-subtitle2 text-grey-8">จุดเริ่มต้น (Node A)</div>
                      </q-card-section>
                      <q-separator />
                      <q-card-section>
                        <q-select v-model="form.selectedA" :options="buildingOptions" emit-value map-options
                          label="เลือกอาคาร A" outlined dense bg-color="white" :disable="buildingOptions.length === 0"
                          class="q-mb-sm" />
                        <div class="row q-col-gutter-sm">
                          <div class="col-6">
                            <q-input :model-value="form.latA" type="number" label="Lat A" outlined dense
                              bg-color="white" readonly />
                          </div>
                          <div class="col-6">
                            <q-input :model-value="form.lngA" type="number" label="Lng A" outlined dense
                              bg-color="white" readonly />
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>

                  <!-- B -->
                  <div class="col-12 col-md-6">
                    <q-card flat bordered class="bg-blue-grey-1 h-full">
                      <q-card-section class="q-pt-sm q-pb-sm">
                        <div class="text-subtitle2 text-grey-8">จุดสิ้นสุด (Node B)</div>
                      </q-card-section>
                      <q-separator />
                      <q-card-section>
                        <q-select v-model="form.selectedB" :options="buildingOptions" emit-value map-options
                          label="เลือกอาคาร B" outlined dense bg-color="white" :disable="buildingOptions.length === 0"
                          class="q-mb-sm" />
                        <div class="row q-col-gutter-sm">
                          <div class="col-6">
                            <q-input :model-value="form.latB" type="number" label="Lat B" outlined dense
                              bg-color="white" readonly />
                          </div>
                          <div class="col-6">
                            <q-input :model-value="form.lngB" type="number" label="Lng B" outlined dense
                              bg-color="white" readonly />
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>

                <!-- Weight + Actions -->
                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-12 col-md-6">
                    <div class="row q-col-gutter-md">
                      <div class="col-6">
                        <q-input v-model.number="form.distance" type="number" label="ระยะทาง (เมตร)" outlined dense
                          hint="Auto จาก markers">
                          <template #prepend><q-icon name="straighten" /></template>
                        </q-input>
                      </div>
                      <div class="col-6">
                        <q-input v-model.number="form.time" type="number" label="เวลา (นาที)" outlined dense
                          :hint="form.time ? `ประมาณ ${formatTime(Math.round(form.time * 60))}` : 'Avg Speed 80m/min'">
                          <template #prepend><q-icon name="schedule" /></template>
                        </q-input>
                      </div>
                    </div>
                  </div>

                  <div class="col-12 col-md-6 flex flex-center">
                    <div class="row q-gutter-sm">
                      <q-btn unelevated :color="isEditing ? 'orange' : 'primary'"
                        :icon="isEditing ? 'save_as' : 'add_circle'" :label="isEditing ? 'บันทึกแก้ไข' : 'เพิ่มข้อมูล'"
                        @click="saveData" />
                      <q-btn v-if="isEditing" unelevated color="negative" icon="delete" label="ลบ"
                        @click="deleteData" />
                      <q-btn outline color="grey" label="ยกเลิก/ล้าง" @click="clearForm" />
                    </div>
                  </div>
                </div>

              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Table -->
        <div class="q-mt-lg">
          <q-card>
            <q-card-section>
              <div class="text-h6 text-grey-8">ตารางข้อมูลเส้นทางทั้งหมด (Database)</div>
            </q-card-section>

            <q-table :rows="edgeList" :columns="columns" row-key="id" flat bordered :pagination="{ rowsPerPage: 10 }">
              <template #body="props">
                <q-tr :props="props" @click="editRow(props.row)" class="cursor-pointer">
                  <q-td key="nameA" :props="props">{{ props.row.nameA }}</q-td>
                  <q-td key="latA" :props="props">{{ getNodeLat(props.row.nameA) }}</q-td>
                  <q-td key="lngA" :props="props">{{ getNodeLng(props.row.nameA) }}</q-td>
                  <q-td key="nameB" :props="props">{{ props.row.nameB }}</q-td>
                  <q-td key="latB" :props="props">{{ getNodeLat(props.row.nameB) }}</q-td>
                  <q-td key="lngB" :props="props">{{ getNodeLng(props.row.nameB) }}</q-td>
                  <q-td key="distance" :props="props" class="text-center">{{ props.row.distance }}</q-td>
                  <q-td key="time" :props="props" class="text-center">{{ props.row.time }}</q-td>
                  <q-td key="actions" :props="props" class="text-center">
                    <q-btn flat round color="primary" icon="edit" size="sm" />
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </q-card>
        </div>

      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw, watch } from 'vue';
import { useQuasar } from 'quasar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from 'boot/axios';
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
const CACHE_KEY = 'graph_cache_shortest_v1';
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

/* ---------- Leaflet Icon ---------- */
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

/* ---------- State ---------- */
const markerList = ref([]);
const edgeList = ref([]);

const editingId = ref(null);
const isEditing = computed(() => editingId.value !== null);

const form = reactive({
  selectedA: null,
  selectedB: null,
  latA: '',
  lngA: '',
  latB: '',
  lngB: '',
  distance: '',
  time: ''
});

const calcStart = ref(null);
const calcEnd = ref(null);
const calcWeight = ref('distance');

const result = reactive({
  visible: false,
  start: '',
  end: '',
  path: [],
  totalDistance: 0,
  totalTimeSeconds: 0,
  totalTimeFormatted: '00:00:00'
});

/* ---------- Single source of truth for coords = markers ---------- */
const buildings = computed(() => {
  const b = {};
  markerList.value.forEach(m => {
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    if (!m.name || isNaN(lat) || isNaN(lng)) return;
    b[m.name] = { lat, lng };
  });
  return b;
});

const buildingOptions = computed(() =>
  Object.keys(buildings.value)
    .sort()
    .map(name => ({ label: name, value: name }))
);

const graphNodeOptions = computed(() => Object.keys(buildings.value).sort());

/* ---------- Table Columns ---------- */
const columns = [
  { name: 'nameA', label: 'อาคาร A', field: 'nameA', align: 'left', sortable: true },
  { name: 'latA', label: 'Lat A', field: 'latA', align: 'left' },
  { name: 'lngA', label: 'Lng A', field: 'lngA', align: 'left' },
  { name: 'nameB', label: 'อาคาร B', field: 'nameB', align: 'left', sortable: true },
  { name: 'latB', label: 'Lat B', field: 'latB', align: 'left' },
  { name: 'lngB', label: 'Lng B', field: 'lngB', align: 'left' },
  { name: 'distance', label: 'ระยะ (ม.)', field: 'distance', align: 'center', sortable: true },
  { name: 'time', label: 'เวลา (นาที)', field: 'time', align: 'center', sortable: true },
  { name: 'actions', label: 'จัดการ', align: 'center' }
];

function getNodeLat(name) {
  const n = buildings.value[name];
  return n ? n.lat.toFixed(5) : '-';
}
function getNodeLng(name) {
  const n = buildings.value[name];
  return n ? n.lng.toFixed(5) : '-';
}

/* ---------- Map ---------- */
const map = ref(null);
const markersLayer = ref(null);
const edgesLayer = ref(null);
const edgePolylineMap = new Map(); // key: A|B sorted

function edgeKey(a, b) {
  return [a, b].sort().join('|');
}

function initMap() {
  if (map.value) return;

  map.value = markRaw(L.map('map-path', {
    preferCanvas: true
  }).setView([18.758, 99.015], 17));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map.value);

  edgesLayer.value = markRaw(L.layerGroup()).addTo(map.value);
  markersLayer.value = markRaw(L.layerGroup()).addTo(map.value);
}

function resetHighlight() {
  if (!edgesLayer.value) return;
  edgesLayer.value.eachLayer(layer => {
    if (layer instanceof L.Polyline) layer.setStyle({ color: '#3388ff', weight: 3, opacity: 0.7 });
  });
}

function updateMapVisuals() {
  if (!map.value || !markersLayer.value || !edgesLayer.value) return;

  markersLayer.value.clearLayers();
  edgesLayer.value.clearLayers();
  edgePolylineMap.clear();

  const bounds = L.latLngBounds();
  let has = false;

  // markers from DB markers
  for (const name in buildings.value) {
    const n = buildings.value[name];
    const marker = L.marker([n.lat, n.lng], { icon: greenIcon }).bindPopup(name);
    markersLayer.value.addLayer(marker);
    bounds.extend([n.lat, n.lng]);
    has = true;
  }

  // edges from DB edges + coords from markers
  edgeList.value.forEach(e => {
    const A = buildings.value[e.nameA];
    const B = buildings.value[e.nameB];
    if (!A || !B) return;

    const poly = L.polyline([[A.lat, A.lng], [B.lat, B.lng]], {
      color: '#3388ff',
      weight: 3,
      opacity: 0.7
    });

    // ✅ tooltip แบบ hover (เบากว่า permanent)
    poly.bindTooltip(`${e.distance}ม. / ${e.time}น.`, { sticky: true });

    edgesLayer.value.addLayer(poly);
    edgePolylineMap.set(edgeKey(e.nameA, e.nameB), poly);

    bounds.extend([A.lat, A.lng]);
    bounds.extend([B.lat, B.lng]);
    has = true;
  });

  if (has) map.value.fitBounds(bounds, { padding: [50, 50] });
}

function highlightPolyline(a, b) {
  const line = edgePolylineMap.get(edgeKey(a, b));
  if (!line) return;
  line.setStyle({ color: '#ef4444', weight: 6, opacity: 1 });
  line.bringToFront();
}

/* ---------- Auto fill coords + compute dist/time ---------- */
watch(
  () => [form.selectedA, form.selectedB],
  () => {
    const A = buildings.value[form.selectedA];
    const B = buildings.value[form.selectedB];

    form.latA = A ? A.lat : '';
    form.lngA = A ? A.lng : '';
    form.latB = B ? B.lat : '';
    form.lngB = B ? B.lng : '';

    if (A && B && form.selectedA !== form.selectedB) {
      const dist = L.latLng(A.lat, A.lng).distanceTo(L.latLng(B.lat, B.lng));
      form.distance = Math.round(dist);
      form.time = Math.max(1, Math.round(dist / 80));
    }
  }
);

/* ---------- Load (faster: cache-first + Promise.all) ---------- */
function fallbackEdgesFromConstants() {
  return SHARED_EDGES.map((e, i) => ({
    id: `seed-${i}`,
    nameA: e.nameA,
    nameB: e.nameB,
    distance: Number(e.distance),
    time: Number(e.time)
  }));
}

async function loadFromBackendFast() {
  // 1) show cache immediately
  const hasCache = loadCache();
  if (hasCache) updateMapVisuals();

  safeLoadingShow('กำลังดึงข้อมูลจาก Server...');

  try {
    const [markerResp, edgeResp] = await Promise.all([
      api.get('/api/markers'),
      api.get('/api/edges')
    ]);

    markerList.value = markerResp.data?.length ? markerResp.data : [...SHARED_LOCATIONS];
    edgeList.value = edgeResp.data?.length ? edgeResp.data : fallbackEdgesFromConstants();

    // remove edges pointing to missing markers
    const before = edgeList.value.length;
    edgeList.value = edgeList.value.filter(e => buildings.value[e.nameA] && buildings.value[e.nameB]);
    const removed = before - edgeList.value.length;
    if (removed > 0) $q.notify?.({ type: 'warning', message: `ตัดเส้นทางที่อ้างอิงสถานที่ที่ไม่มีใน Markers ออกแล้ว ${removed} รายการ` });

    updateMapVisuals();
    saveCache();

    // set default calc selections
    if (graphNodeOptions.value.length >= 2) {
      calcStart.value ??= graphNodeOptions.value[0];
      calcEnd.value ??= graphNodeOptions.value[1];
    }
  } catch (e) {
    console.error(e);
    $q.notify?.({ type: 'negative', message: 'โหลดข้อมูลไม่สำเร็จ (ใช้ข้อมูลสำรอง)' });

    markerList.value = [...SHARED_LOCATIONS];
    edgeList.value = fallbackEdgesFromConstants().filter(ed => buildings.value[ed.nameA] && buildings.value[ed.nameB]);
    updateMapVisuals();
  } finally {
    safeLoadingHide();
  }
}

/* ---------- CRUD ---------- */
function clearForm() {
  form.selectedA = null;
  form.selectedB = null;
  form.latA = form.lngA = form.latB = form.lngB = '';
  form.distance = '';
  form.time = '';
  editingId.value = null;

  result.visible = false;
  resetHighlight();
}

function validateEdge() {
  if (!form.selectedA || !form.selectedB) {
    $q.notify?.({ type: 'warning', message: 'กรุณาเลือกอาคาร A และ B' });
    return false;
  }
  if (form.selectedA === form.selectedB) {
    $q.notify?.({ type: 'warning', message: 'อาคาร A และ B ต้องไม่ซ้ำกัน' });
    return false;
  }
  if (!buildings.value[form.selectedA] || !buildings.value[form.selectedB]) {
    $q.notify?.({ type: 'warning', message: 'กรุณาเพิ่มสถานที่ในฐานข้อมูล (Markers) ให้ครบก่อน' });
    return false;
  }
  if (!form.distance || Number(form.distance) <= 0) {
    $q.notify?.({ type: 'warning', message: 'ระยะทางไม่ถูกต้อง' });
    return false;
  }
  if (!form.time || Number(form.time) <= 0) {
    $q.notify?.({ type: 'warning', message: 'เวลาไม่ถูกต้อง' });
    return false;
  }

  // prevent duplicate (undirected)
  const key = edgeKey(form.selectedA, form.selectedB);
  const dup = edgeList.value.find(e => edgeKey(e.nameA, e.nameB) === key && e.id !== editingId.value);
  if (dup) {
    $q.notify?.({ type: 'warning', message: 'มีเส้นทางคู่นี้อยู่แล้ว' });
    return false;
  }

  return true;
}

function edgePayload() {
  const A = buildings.value[form.selectedA];
  const B = buildings.value[form.selectedB];
  return {
    id: editingId.value ?? undefined,
    nameA: form.selectedA,
    nameB: form.selectedB,
    // ส่ง coords ให้ backend ได้ (ถ้าจำเป็น) แต่ UI ไม่ใช้เป็น source
    latA: A?.lat,
    lngA: A?.lng,
    latB: B?.lat,
    lngB: B?.lng,
    distance: Number(form.distance),
    time: Number(form.time)
  };
}

async function saveData() {
  if (!validateEdge()) return;

  try {
    const payload = edgePayload();
    const resp = await api.post('/api/edges', payload);

    const saved = resp.data;
    const idx = edgeList.value.findIndex(e => e.id === saved.id);
    if (idx >= 0) edgeList.value[idx] = saved;
    else edgeList.value.push(saved);

    $q.notify?.({ type: 'positive', message: isEditing.value ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มข้อมูลเรียบร้อย' });

    clearForm();
    updateMapVisuals();
    saveCache();
  } catch (e) {
    console.error(e);
    $q.notify?.({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
}

function editRow(row) {
  editingId.value = row.id ?? null;
  form.selectedA = row.nameA;
  form.selectedB = row.nameB;
  form.distance = Number(row.distance);
  form.time = Number(row.time);
}

async function deleteData() {
  if (!editingId.value) return;

  const item = edgeList.value.find(e => e.id === editingId.value);
  if (!item) return;

  $q.dialog({
    title: 'ยืนยันการลบ',
    message: `ต้องการลบเส้นทาง ${item.nameA} - ${item.nameB} หรือไม่?`,
    cancel: true,
    persistent: true,
    ok: { flat: true, color: 'negative', label: 'ลบออก' }
  }).onOk(async () => {
    try {
      await api.delete(`/api/edges/${editingId.value}`);
      edgeList.value = edgeList.value.filter(e => e.id !== editingId.value);

      clearForm();
      updateMapVisuals();
      saveCache();

      $q.notify?.({ type: 'negative', message: 'ลบข้อมูลแล้ว' });
    } catch (e) {
      console.error(e);
      $q.notify?.({ type: 'negative', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  });
}

/* ---------- Dijkstra (fast enough, uses adjacency built on demand) ---------- */
function runCalculation() {
  resetHighlight();
  result.visible = false;

  const start = calcStart.value;
  const end = calcEnd.value;

  if (!start || !end) {
    $q.notify?.({ type: 'warning', message: 'กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง' });
    return;
  }

  if (start === end) {
    result.visible = true;
    result.start = start;
    result.end = end;
    result.path = [start];
    result.totalDistance = 0;
    result.totalTimeSeconds = 0;
    result.totalTimeFormatted = formatTime(0);
    return;
  }

  const nodes = graphNodeOptions.value;
  const adj = {};
  nodes.forEach(n => (adj[n] = []));

  edgeList.value.forEach(e => {
    const w = Number(e[calcWeight.value]);
    if (isNaN(w)) return;
    if (!adj[e.nameA]) adj[e.nameA] = [];
    if (!adj[e.nameB]) adj[e.nameB] = [];
    adj[e.nameA].push({ node: e.nameB, weight: w });
    adj[e.nameB].push({ node: e.nameA, weight: w });
  });

  const dist = {};
  const prev = {};
  const visited = new Set();
  nodes.forEach(n => (dist[n] = Infinity));
  dist[start] = 0;

  while (true) {
    let u = null;
    let min = Infinity;
    nodes.forEach(n => {
      if (!visited.has(n) && dist[n] < min) {
        min = dist[n];
        u = n;
      }
    });

    if (u === null || u === end) break;
    visited.add(u);

    (adj[u] || []).forEach(nb => {
      const alt = dist[u] + nb.weight;
      if (alt < dist[nb.node]) {
        dist[nb.node] = alt;
        prev[nb.node] = u;
      }
    });
  }

  if (dist[end] === Infinity) {
    $q.notify?.({ type: 'warning', message: 'ไม่พบเส้นทาง' });
    return;
  }

  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }

  for (let i = 0; i < path.length - 1; i++) highlightPolyline(path[i], path[i + 1]);

  let totalDist = 0;
  let totalTimeSeconds = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i], v = path[i + 1];
    const edge = edgeList.value.find(e => (e.nameA === u && e.nameB === v) || (e.nameA === v && e.nameB === u));
    if (edge) {
      totalDist += Number(edge.distance);
      totalTimeSeconds += Number(edge.time) * 60;
    }
  }

  result.visible = true;
  result.start = start;
  result.end = end;
  result.path = path;
  result.totalDistance = totalDist;
  result.totalTimeSeconds = totalTimeSeconds;
  result.totalTimeFormatted = formatTime(totalTimeSeconds);
}

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  initMap();
  await loadFromBackendFast();
});

onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});
</script>

<style scoped>
:deep(.leaflet-tooltip) {
  font-size: 11px;
}
</style>
