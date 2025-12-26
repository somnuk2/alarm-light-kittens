<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">กำหนดเส้นทางสั้นที่สุดไปจุดปลอดภัย</h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">โรงเรียนวารีเชียงใหม่ -
          วิเคราะห์เส้นทางเดินที่สั้นที่สุดบนแผนที่จริง</p>

        <div class="row q-col-gutter-lg">
          <!-- Left Column: CRUD Form -->
          <!-- Map Section (Top) -->
          <div class="col-12">
            <q-card class="my-card q-mb-lg fit">
              <q-card-section class="q-pb-none">
                <div class="text-h6 text-primary flex items-center">
                  <q-icon name="map" class="q-mr-sm" />
                  แผนที่นําทาง (LeafletJS Map)
                </div>
                <div class="text-caption text-grey">เส้นสีน้ำเงิน = เส้นทางปกติ | เส้นสีแดง = เส้นทางที่สั้นที่สุด</div>
              </q-card-section>

              <q-card-section>
                <!-- Map Container -->
                <div id="map-path" class="rounded-borders shadow-1" style="height: 650px; width: 100%; z-index: 1;">
                </div>
              </q-card-section>

              <!-- Calculation Controls inside Card (Bottom of Map) -->
              <q-separator />
              <q-card-section class="bg-blue-1">
                <div class="text-subtitle1 text-primary text-weight-bold">🎬 คำนวณหาเส้นทางสั้นที่สุด (Dijkstra
                  Algorithm)</div>

                <div class="row q-col-gutter-md q-mt-xs items-center">
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcStart" :options="graphNodeOptions" label="จุดเริ่มต้น" outlined dense
                      bg-color="white" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcEnd" :options="graphNodeOptions" label="จุดปลายทาง" outlined dense
                      bg-color="white" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-select v-model="calcWeight"
                      :options="[{ label: 'ระยะทาง (เมตร)', value: 'distance' }, { label: 'เวลา (นาที)', value: 'time' }]"
                      emit-value map-options label="เกณฑ์คำนวณ" outlined dense bg-color="white" />
                  </div>
                </div>

                <div class="q-mt-md text-center">
                  <q-btn unelevated color="primary" icon="search" label="คำนวณเส้นทาง" @click="runCalculation"
                    class="full-width-sm" />
                </div>

                <!-- Result Text -->
                <div v-if="resultHtml" class="q-mt-md q-pa-md bg-white rounded-borders shadow-1 ">
                  <div v-html="resultHtml" class="text-body1 text-center"></div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Edge Data Form (Below Map) -->
          <div class="col-12">
            <q-card class="my-card h-full">
              <q-card-section>
                <div class="text-h6 text-primary flex items-center q-mb-md">
                  <q-icon name="edit_road" class="q-mr-sm" />
                  จัดการข้อมูลเส้นทาง (Edge Data)
                </div>

                <div class="row q-col-gutter-md">
                  <!-- Building A -->
                  <div class="col-12 col-md-6">
                    <q-card flat bordered class="bg-blue-grey-1 h-full">
                      <q-card-section class="q-pt-sm q-pb-sm">
                        <div class="text-subtitle2 text-grey-8">จุดเริ่มต้น (Node A)</div>
                      </q-card-section>
                      <q-separator />
                      <q-card-section>
                        <q-select v-model="form.selectedA" :options="buildingOptions" emit-value map-options
                          label="เลือกอาคาร A" outlined dense bg-color="white" @update:model-value="onSelectA"
                          class="q-mb-sm" />
                        <q-input v-if="form.selectedA === 'other'" v-model="form.nameA" label="ระบุชื่ออาคารเอง"
                          outlined dense bg-color="white" class="q-mb-sm" />
                        <div class="row q-col-gutter-sm">
                          <div class="col-6">
                            <q-input v-model.number="form.latA" type="number" label="Lat A" outlined dense
                              bg-color="white" :readonly="isReadOnlyA" />
                          </div>
                          <div class="col-6">
                            <q-input v-model.number="form.lngA" type="number" label="Lng A" outlined dense
                              bg-color="white" :readonly="isReadOnlyA" />
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>

                  <!-- Building B -->
                  <div class="col-12 col-md-6">
                    <q-card flat bordered class="bg-blue-grey-1 h-full">
                      <q-card-section class="q-pt-sm q-pb-sm">
                        <div class="text-subtitle2 text-grey-8">จุดสิ้นสุด (Node B)</div>
                      </q-card-section>
                      <q-separator />
                      <q-card-section>
                        <q-select v-model="form.selectedB" :options="buildingOptions" emit-value map-options
                          label="เลือกอาคาร B" outlined dense bg-color="white" @update:model-value="onSelectB"
                          class="q-mb-sm" />
                        <q-input v-if="form.selectedB === 'other'" v-model="form.nameB" label="ระบุชื่ออาคารเอง"
                          outlined dense bg-color="white" class="q-mb-sm" />
                        <div class="row q-col-gutter-sm">
                          <div class="col-6">
                            <q-input v-model.number="form.latB" type="number" label="Lat B" outlined dense
                              bg-color="white" :readonly="isReadOnlyB" />
                          </div>
                          <div class="col-6">
                            <q-input v-model.number="form.lngB" type="number" label="Lng B" outlined dense
                              bg-color="white" :readonly="isReadOnlyB" />
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>

                <!-- Weight & Actions -->
                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-12 col-md-6">
                    <div class="row q-col-gutter-md">
                      <div class="col-6">
                        <q-input v-model="form.distance" type="number" label="ระยะทาง (เมตร)"
                          placeholder="คำนวณอัตโนมัติ" outlined dense hint="Auto-Calculated">
                          <template v-slot:prepend><q-icon name="straighten" /></template>
                        </q-input>
                      </div>
                      <div class="col-6">
                        <q-input v-model="form.time" type="number" label="เวลา (นาที)" placeholder="คำนวณอัตโนมัติ"
                          outlined dense hint="Avg Speed 80m/min">
                          <template v-slot:prepend><q-icon name="schedule" /></template>
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

        <!-- Data Table -->
        <div class="q-mt-lg">
          <q-card>
            <q-card-section>
              <div class="text-h6 text-grey-8">ตารางข้อมูลเส้นทางทั้งหมด (Database)</div>
            </q-card-section>
            <q-table :rows="edgeList" :columns="columns" row-key="id" flat bordered :pagination="{ rowsPerPage: 10 }">
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn flat round color="primary" icon="edit" size="sm"
                    @click="editRow(props.row, props.pageIndex)" />
                </q-td>
              </template>

              <template v-slot:body="props">
                <q-tr :props="props" @click="editRow(props.row, edgeList.indexOf(props.row))" class="cursor-pointer">
                  <q-td key="nameA" :props="props">{{ props.row.nameA }}</q-td>
                  <q-td key="latA" :props="props">{{ Number(props.row.latA).toFixed(5) }}</q-td>
                  <q-td key="lngA" :props="props">{{ Number(props.row.lngA).toFixed(5) }}</q-td>
                  <q-td key="nameB" :props="props">{{ props.row.nameB }}</q-td>
                  <q-td key="latB" :props="props">{{ Number(props.row.latB).toFixed(5) }}</q-td>
                  <q-td key="lngB" :props="props">{{ Number(props.row.lngB).toFixed(5) }}</q-td>
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

// --- Map Constants ---
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Constants & Defaults
const buildings = {};
SHARED_LOCATIONS.forEach(loc => {
  buildings[loc.name] = [loc.lat, loc.lng];
});

const buildingOptions = Object.keys(buildings).map(k => ({ label: k, value: k }));
buildingOptions.push({ label: 'อื่นๆ (กรอกเอง)', value: 'other' });

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
]

// Reactive State
const edgeList = ref([]);
const editingIndex = ref(-1);
const isEditing = computed(() => editingIndex.value !== -1);

const form = reactive({
  selectedA: null,
  nameA: '', latA: '', lngA: '',
  selectedB: null,
  nameB: '', latB: '', lngB: '',
  distance: '', time: ''
});

const calcStart = ref(null);
const calcEnd = ref(null);
const calcWeight = ref('distance');
const resultHtml = ref('');

// Graph / Map Data
const nodesGraph = ref({}); // Keep track of unique nodes for dropdown
const map = ref(null);
const markersLayer = ref(null);
const edgesLayer = ref(null);

const isReadOnlyA = computed(() => form.selectedA && form.selectedA !== 'other');
const isReadOnlyB = computed(() => form.selectedB && form.selectedB !== 'other');

const graphNodeOptions = computed(() => Object.keys(nodesGraph.value).sort());

// --- Watchers for Auto Calculation ---
// When user inputs coords for A and B, calculate distance/time automatically
watch(
  [() => form.latA, () => form.lngA, () => form.latB, () => form.lngB],
  ([la, lna, lb, lnb]) => {
    if (
      la && lna && lb && lnb &&
      !isNaN(la) && !isNaN(lna) && !isNaN(lb) && !isNaN(lnb)
    ) {
      const pointA = L.latLng(la, lna);
      const pointB = L.latLng(lb, lnb);
      const dist = pointA.distanceTo(pointB); // meters
      const time = dist / 80; // avg walking speed 80m/min

      // Update form if not editing existing (or maybe update anyway? Let's update anyway for convenience)
      // Only update if it looks like user is entering data, not just loading
      // But for simplicity, let's just update.
      form.distance = Math.round(dist);
      form.time = Math.round(time);
    }
  }
);

// Methods
function onSelectA(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameA = val;
    form.latA = lat;
    form.lngA = lng;
  } else if (!val) {
    form.nameA = ''; form.latA = ''; form.lngA = '';
  }
}

function onSelectB(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameB = val;
    form.latB = lat;
    form.lngB = lng;
  } else if (!val) {
    form.nameB = ''; form.latB = ''; form.lngB = '';
  }
}

function clearForm() {
  form.selectedA = null; form.nameA = ''; form.latA = ''; form.lngA = '';
  form.selectedB = null; form.nameB = ''; form.latB = ''; form.lngB = '';
  form.distance = ''; form.time = '';
  editingIndex.value = -1;
}

// --- Map Logic ---
function initMap() {
  if (map.value) return; // already initialized

  // Use markRaw to prevent Vue from making the map instance reactive (performance)
  map.value = markRaw(L.map("map-path").setView([18.758, 99.015], 17)); // Centered on Varee School

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map.value);

  // Layers
  edgesLayer.value = markRaw(L.layerGroup()).addTo(map.value);
  markersLayer.value = markRaw(L.layerGroup()).addTo(map.value);
}

function updateMapVisuals() {
  if (!map.value) return;

  // Clear Layers
  markersLayer.value.clearLayers();
  edgesLayer.value.clearLayers();

  const uniqueNodes = {};
  const edges = [];

  edgeList.value.forEach(e => {
    // Collect Nodes
    if (!uniqueNodes[e.nameA]) uniqueNodes[e.nameA] = { lat: Number(e.latA), lng: Number(e.lngA) };
    if (!uniqueNodes[e.nameB]) uniqueNodes[e.nameB] = { lat: Number(e.latB), lng: Number(e.lngB) };

    // Draw Edge (Polyline)
    const latlngs = [
      [Number(e.latA), Number(e.lngA)],
      [Number(e.latB), Number(e.lngB)]
    ];
    const polyline = L.polyline(latlngs, {
      color: '#3388ff',
      weight: 3,
      opacity: 0.7,
      smoothFactor: 1
    });

    // Add Tooltip with info
    polyline.bindTooltip(`${e.distance}ม. / ${e.time}น.`, {
      permanent: true,
      direction: 'center',
      className: 'edge-tooltip'
    });

    edgesLayer.value.addLayer(polyline);

    // Store for Dijkstra
    edges.push({
      a: e.nameA, b: e.nameB,
      distance: Number(e.distance), time: Number(e.time),
      polylineObj: polyline // Keep reference to highlight later
    });
  });

  // Draw Markers (Nodes)
  const bounds = L.latLngBounds();
  let hasNodes = false;

  Object.keys(uniqueNodes).forEach(name => {
    const node = uniqueNodes[name];
    const marker = L.marker([node.lat, node.lng], { icon: greenIcon });

    marker.bindPopup(`<b>${name}</b><br>Lat: ${node.lat}<br>Lng: ${node.lng}`);
    markersLayer.value.addLayer(marker);

    bounds.extend([node.lat, node.lng]);
    hasNodes = true;
  });

  // Fit Bounds if we have nodes
  if (hasNodes && map.value) {
    map.value.fitBounds(bounds, { padding: [50, 50] });
  }

  // Update Graph State for Calculation
  nodesGraph.value = uniqueNodes;
}

async function saveData() {
  if (!form.nameA || !form.nameB || !form.distance || !form.time) {
    $q.notify({ type: 'warning', message: 'กรุณากรอกข้อมูลให้ครบ' });
    return;
  }
  const newData = {
    nameA: form.nameA, latA: Number(form.latA), lngA: Number(form.lngA),
    nameB: form.nameB, latB: Number(form.latB), lngB: Number(form.lngB),
    distance: Number(form.distance), time: Number(form.time)
  };

  try {
    if (isEditing.value) {
      const id = edgeList.value[editingIndex.value].id;
      const resp = await api.post('/api/edges', { ...newData, id });
      edgeList.value[editingIndex.value] = resp.data;
      $q.notify({ type: 'positive', message: 'แก้ไขข้อมูลเรียบร้อย' });
    } else {
      const resp = await api.post('/api/edges', newData);
      edgeList.value.push(resp.data);
      $q.notify({ type: 'positive', message: 'เพิ่มข้อมูลเรียบร้อย' });
    }

    clearForm();
    updateMapVisuals();
  } catch (error) {
    console.error('Error saving edge:', error);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
}

function editRow(row, idx) {
  if (idx < 0) idx = edgeList.value.indexOf(row);
  editingIndex.value = idx;
  form.nameA = row.nameA; form.latA = row.latA; form.lngA = row.lngA;
  form.nameB = row.nameB; form.latB = row.latB; form.lngB = row.lngB;
  form.distance = row.distance; form.time = row.time;

  // Attempt to match dropdown
  form.selectedA = buildings[row.nameA] ? row.nameA : 'other';
  form.selectedB = buildings[row.nameB] ? row.nameB : 'other';
}

async function deleteData() {
  if (editingIndex.value === -1) return;
  const item = edgeList.value[editingIndex.value];

  $q.dialog({
    title: 'ยืนยันการลบ',
    message: `ต้องการลบเส้นทาง ${item.nameA} - ${item.nameB} หรือไม่?`,
    cancel: true,
    persistent: true,
    ok: { flat: true, color: 'negative', label: 'ลบออก' }
  }).onOk(async () => {
    try {
      await api.delete(`/api/edges/${item.id}`);
      edgeList.value.splice(editingIndex.value, 1);
      clearForm();
      updateMapVisuals();
      $q.notify({ type: 'negative', message: 'ลบข้อมูลแล้ว' });
    } catch (error) {
      console.error('Error deleting edge:', error);
      $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  });
}

async function loadFromBackend() {
  const defaultData = SHARED_EDGES.map(edge => {
    const locA = SHARED_LOCATIONS.find(l => l.name === edge.nameA);
    const locB = SHARED_LOCATIONS.find(l => l.name === edge.nameB);
    return {
      nameA: edge.nameA,
      latA: locA ? locA.lat.toString() : '0',
      lngA: locA ? locA.lng.toString() : '0',
      nameB: edge.nameB,
      latB: locB ? locB.lat.toString() : '0',
      lngB: locB ? locB.lng.toString() : '0',
      distance: edge.distance.toString(),
      time: edge.time.toString()
    };
  });

  try {
    const resp = await api.get('/api/edges');
    // If backend returns data
    if (resp.data && resp.data.length > 0) {
      edgeList.value = resp.data;
    } else {
      // Fallback to default if DB is empty
      edgeList.value = [...defaultData];
    }
  } catch (error) {
    console.error('Error loading edges:', error);
    $q.notify({ type: 'negative', message: 'ไม่สามารถดึงข้อมูลจาก Server ได้' });
    edgeList.value = [...defaultData];
  }
  updateMapVisuals();
}

// --- Dijkstra Calculation ---
function runCalculation() {
  // Reset Visuals (Blue lines)
  if (edgesLayer.value) {
    edgesLayer.value.eachLayer((layer) => {
      if (layer instanceof L.Polyline) {
        layer.setStyle({ color: '#3388ff', weight: 3 });
      }
    });
  }
  resultHtml.value = '';

  const start = calcStart.value;
  const end = calcEnd.value;

  if (!start || !end) {
    $q.notify({ type: 'warning', message: 'กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง' });
    return;
  }

  if (start === end) {
    resultHtml.value = `<div class="text-h6">จุดเดียวกัน (${start})</div>ระยะทาง 0`;
    return;
  }

  // 1. Build Adjacency List
  const adj = {};
  const uniqueNodes = Object.keys(nodesGraph.value);
  uniqueNodes.forEach(n => adj[n] = []);

  edgeList.value.forEach(e => {
    // Ensure nodes exist in adj (in case sync issue)
    if (!adj[e.nameA]) adj[e.nameA] = [];
    if (!adj[e.nameB]) adj[e.nameB] = [];

    const weight = Number(e[calcWeight.value]);
    adj[e.nameA].push({ node: e.nameB, weight });
    adj[e.nameB].push({ node: e.nameA, weight });
  });

  // 2. Dijkstra
  const dist = {};
  const prev = {};
  const visited = new Set();
  uniqueNodes.forEach(n => dist[n] = Infinity);
  dist[start] = 0;

  while (true) {
    let u = null;
    let minDist = Infinity;
    uniqueNodes.forEach(n => {
      if (!visited.has(n) && dist[n] < minDist) {
        minDist = dist[n];
        u = n;
      }
    });

    if (u === null || u === end) break;
    visited.add(u);

    if (adj[u]) {
      adj[u].forEach(neighbor => {
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = u;
        }
      });
    }
  }

  if (dist[end] === Infinity) {
    resultHtml.value = 'ไม่พบเส้นทาง';
    return;
  }

  // 3. Reconstruct Path
  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }

  // 4. Highlight Path on Map
  // Iterate path pairs
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    highlightPolyline(u, v);
  }

  const unit = calcWeight.value === 'distance' ? 'เมตร' : 'นาที';
  resultHtml.value = `
    <div class="text-subtitle1">เส้นทางที่สั้นที่สุดจาก <strong>${start}</strong> ไป <strong>${end}</strong></div>
    <div class="text-body2 q-my-xs">เส้นทาง: ${path.join(' → ')}</div>
    <div class="text-h6 text-positive">ค่ารวมทั้งหมด: <strong>${Math.round(dist[end] * 100) / 100} ${unit}</strong></div>
  `;
}

function highlightPolyline(nameA, nameB) {
  // Naive search: look through all visible polylines and match coordinates
  const nodeA = nodesGraph.value[nameA];
  const nodeB = nodesGraph.value[nameB];

  if (!nodeA || !nodeB) return;

  const latA = nodeA.lat, lngA = nodeA.lng;
  const latB = nodeB.lat, lngB = nodeB.lng;

  // Leaflet layers
  edgesLayer.value.eachLayer(layer => {
    if (layer instanceof L.Polyline) {
      const latlngs = layer.getLatLngs();
      // Polyline usually has 2 points for a simple edge
      if (latlngs.length >= 2) {
        const p1 = latlngs[0];
        const p2 = latlngs[1];

        // Check if matches A->B or B->A (approximate due to floating point)
        const match1 = (Math.abs(p1.lat - latA) < 0.0001 && Math.abs(p1.lng - lngA) < 0.0001 &&
          Math.abs(p2.lat - latB) < 0.0001 && Math.abs(p2.lng - lngB) < 0.0001);
        const match2 = (Math.abs(p1.lat - latB) < 0.0001 && Math.abs(p1.lng - lngB) < 0.0001 &&
          Math.abs(p2.lat - latA) < 0.0001 && Math.abs(p2.lng - lngA) < 0.0001);

        if (match1 || match2) {
          layer.setStyle({ color: '#ef4444', weight: 6 });
          layer.bringToFront();
        }
      }
    }
  });
}

onMounted(() => {
  initMap();
  loadFromBackend();
});

onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});
</script>

<style scoped>
/* Override tooltip style */
:deep(.edge-tooltip) {
  background: white;
  border: 1px solid #3388ff;
  color: #3388ff;
  font-size: 10px;
  padding: 0 4px;
  border-radius: 4px;
  opacity: 0.9;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
