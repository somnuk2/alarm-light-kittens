<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">กำหนดเส้นทางสั้นที่สุดไปจุดปลอดภัย</h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">โรงเรียนวารีเชียงใหม่ - วิเคราะห์เส้นทางเดินที่สั้นที่สุด</p>

        <div class="row q-col-gutter-lg">
          <!-- Left Column: CRUD Form -->
          <div class="col-12 col-lg-5">
            <q-card class="my-card h-full">
              <q-card-section>
                <div class="text-h6 text-primary flex items-center q-mb-md">
                  <q-icon name="edit_road" class="q-mr-sm" />
                  จัดการข้อมูลเส้นทาง (Edge Data)
                </div>

                <div class="q-gutter-y-md">
                   <!-- Building A -->
                   <q-card flat bordered class="bg-blue-grey-1">
                     <q-card-section class="q-pt-sm q-pb-sm">
                       <div class="text-subtitle2 text-grey-8">จุดเริ่มต้น (Node A)</div>
                     </q-card-section>
                     <q-separator />
                     <q-card-section>
                       <q-select
                        v-model="form.selectedA"
                        :options="buildingOptions"
                        emit-value
                        map-options
                        label="เลือกอาคาร A"
                        outlined
                        dense
                        bg-color="white"
                        @update:model-value="onSelectA"
                        class="q-mb-sm"
                      />
                      <q-input
                        v-if="form.selectedA === 'other'"
                        v-model="form.nameA"
                        label="ระบุชื่ออาคารเอง"
                        outlined
                        dense
                        bg-color="white"
                        class="q-mb-sm"
                      />
                      <div class="row q-col-gutter-sm">
                        <div class="col-6">
                          <q-input v-model="form.latA" label="Lat A" outlined dense bg-color="white" :readonly="isReadOnlyA" />
                        </div>
                        <div class="col-6">
                           <q-input v-model="form.lngA" label="Lng A" outlined dense bg-color="white" :readonly="isReadOnlyA" />
                        </div>
                      </div>
                     </q-card-section>
                   </q-card>

                   <!-- Building B -->
                   <q-card flat bordered class="bg-blue-grey-1">
                     <q-card-section class="q-pt-sm q-pb-sm">
                       <div class="text-subtitle2 text-grey-8">จุดสิ้นสุด (Node B)</div>
                     </q-card-section>
                     <q-separator />
                     <q-card-section>
                       <q-select
                        v-model="form.selectedB"
                        :options="buildingOptions"
                        emit-value
                        map-options
                        label="เลือกอาคาร B"
                        outlined
                        dense
                        bg-color="white"
                        @update:model-value="onSelectB"
                        class="q-mb-sm"
                      />
                      <q-input
                        v-if="form.selectedB === 'other'"
                        v-model="form.nameB"
                        label="ระบุชื่ออาคารเอง"
                        outlined
                        dense
                        bg-color="white"
                        class="q-mb-sm"
                      />
                      <div class="row q-col-gutter-sm">
                        <div class="col-6">
                          <q-input v-model="form.latB" label="Lat B" outlined dense bg-color="white" :readonly="isReadOnlyB" />
                        </div>
                        <div class="col-6">
                           <q-input v-model="form.lngB" label="Lng B" outlined dense bg-color="white" :readonly="isReadOnlyB" />
                        </div>
                      </div>
                     </q-card-section>
                   </q-card>

                   <!-- Weight -->
                   <div class="row q-col-gutter-md">
                     <div class="col-6">
                       <q-input
                          v-model="form.distance"
                          type="number"
                          label="ระยะทาง (เมตร)"
                          placeholder="เช่น 20"
                          outlined
                          dense
                        >
                          <template v-slot:prepend><q-icon name="straighten" /></template>
                       </q-input>
                     </div>
                     <div class="col-6">
                       <q-input
                          v-model="form.time"
                          type="number"
                          label="เวลา (นาที)"
                          placeholder="เช่น 5"
                          outlined
                          dense
                        >
                          <template v-slot:prepend><q-icon name="schedule" /></template>
                       </q-input>
                     </div>
                   </div>

                   <!-- Actions -->
                   <div class="row q-gutter-sm justify-center q-pt-sm">
                     <q-btn
                      unelevated
                      :color="isEditing ? 'orange' : 'primary'"
                      :icon="isEditing ? 'save_as' : 'add_circle'"
                      :label="isEditing ? 'บันทึกแก้ไข' : 'เพิ่มข้อมูล'"
                      @click="saveData"
                     />
                     <q-btn
                       v-if="isEditing"
                       unelevated
                       color="negative"
                       icon="delete"
                       label="ลบ"
                       @click="deleteData"
                     />
                     <q-btn
                       outline
                       color="grey"
                       label="ยกเลิก/ล้าง"
                       @click="clearForm"
                     />
                   </div>

                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column: Graph & Calculator -->
          <div class="col-12 col-lg-7">
             <q-card class="my-card q-mb-lg">
                <q-card-section>
                  <div class="text-h6 text-primary flex items-center">
                    <q-icon name="hub" class="q-mr-sm" />
                    แผนภาพกราฟ (Graph Logic)
                  </div>
                  <div class="text-caption text-grey">สร้าง Node และ Edge โดยอัตโนมัติตามข้อมูลที่บันทึก</div>
                </q-card-section>

                <div class="q-px-md q-pb-md text-center bg-grey-1" style="overflow: hidden;">
                   <!-- SVG Container -->
                   <div class="canvas-wrapper relative-position shadow-2 rounded-borders bg-white q-mt-sm">
                     <svg id="graph" viewBox="0 0 800 550" preserveAspectRatio="xMidYMid meet">
                        <!-- Lines -->
                        <line
                          v-for="(edge, idx) in edgesGraph"
                          :key="'e-'+idx"
                          :x1="getNodeX(edge.a)"
                          :y1="getNodeY(edge.a)"
                          :x2="getNodeX(edge.b)"
                          :y2="getNodeY(edge.b)"
                          class="edge"
                          :class="{ highlight: isEdgeDataHighlighted(edge) }"
                        />
                         <!-- Text on Line -->
                        <text
                          v-for="(edge, idx) in edgesGraph"
                          :key="'t-'+idx"
                          :x="(getNodeX(edge.a) + getNodeX(edge.b)) / 2"
                          :y="(getNodeY(edge.a) + getNodeY(edge.b)) / 2 - 4"
                          class="edge-label"
                          text-anchor="middle"
                        >
                          {{ edge.distance }} ม.
                        </text>

                        <!-- Nodes (Circles) -->
                        <g v-for="(node, name) in nodesGraph" :key="'n-'+name">
                          <circle
                            :cx="node.x"
                            :cy="node.y"
                            r="7"
                            class="node"
                            :class="{ highlight: isNodeHighlighted(name) }"
                          />
                          <text
                            :x="node.x"
                            :y="node.y - 12"
                            class="node-label"
                            text-anchor="middle"
                          >
                            {{ name }}
                          </text>
                        </g>
                     </svg>
                   </div>

                   <!-- Legend -->
                   <div class="row justify-center q-mt-sm q-gutter-x-md text-caption">
                      <div class="flex items-center"><div class="legend-box edge-normal"></div>เส้นทางปกติ</div>
                      <div class="flex items-center"><div class="legend-box edge-high"></div>เส้นทางที่สั้นที่สุด</div>
                      <div class="flex items-center"><div class="legend-circle node-normal"></div>จุดเช็คพอยต์</div>
                   </div>
                </div>
             </q-card>

             <!-- Calculation -->
             <q-card class="my-card bg-blue-1">
               <q-card-section>
                  <div class="text-subtitle1 text-primary text-weight-bold">🎬 คำนวณหาเส้นทางสั้นที่สุด (Dijkstra Algorithm)</div>

                  <div class="row q-col-gutter-md q-mt-xs items-center">
                    <div class="col-12 col-sm-4">
                       <q-select
                        v-model="calcStart"
                        :options="graphNodeOptions"
                        label="จุดเริ่มต้น"
                        outlined dense bg-color="white"
                       />
                    </div>
                    <div class="col-12 col-sm-4">
                       <q-select
                        v-model="calcEnd"
                        :options="graphNodeOptions"
                        label="จุดปลายทาง"
                        outlined dense bg-color="white"
                       />
                    </div>
                     <div class="col-12 col-sm-4">
                       <q-select
                        v-model="calcWeight"
                        :options="[{label:'ระยะทาง (เมตร)', value:'distance'}, {label:'เวลา (นาที)', value:'time'}]"
                        emit-value map-options
                        label="เกณฑ์คำนวณ"
                        outlined dense bg-color="white"
                       />
                    </div>
                  </div>

                  <div class="q-mt-md text-center">
                     <q-btn unelevated color="primary" icon="search" label="คำนวณเส้นทาง" @click="runCalculation" class="full-width-sm" />
                  </div>

                  <!-- Result Text -->
                  <div v-if="resultHtml" class="q-mt-md q-pa-md bg-white rounded-borders shadow-1 ">
                     <div v-html="resultHtml" class="text-body1 text-center"></div>
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
            <q-table
              :rows="edgeList"
              :columns="columns"
              row-key="index"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn flat round color="primary" icon="edit" size="sm" @click="editRow(props.row, props.pageIndex)" />
                </q-td>
              </template>

                <template v-slot:body="props">
                  <q-tr :props="props" @click="editRow(props.row, edgeList.indexOf(props.row))" class="cursor-pointer">
                    <q-td key="nameA" :props="props">{{ props.row.nameA }}</q-td>
                    <q-td key="latA" :props="props">{{ props.row.latA }}</q-td>
                    <q-td key="lngA" :props="props">{{ props.row.lngA }}</q-td>
                    <q-td key="nameB" :props="props">{{ props.row.nameB }}</q-td>
                    <q-td key="latB" :props="props">{{ props.row.latB }}</q-td>
                    <q-td key="lngB" :props="props">{{ props.row.lngB }}</q-td>
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// Constants & Defaults
const buildings = {
  "อาคาร 1 อาคารอำนวยการ": ["18.75877", "99.01465"],
  "อาคาร 2 อาคารสารสนเทศ": ["18.75891", "99.01526"],
  "อาคาร 3 อาคารประถมศึกษา": ["18.75836", "99.01513"],
  "อาคาร 4 อาคารมัธยมศึกษาตอนต้น": ["18.75798", "99.01551"],
  "อาคาร 5 อาคารอนุบาล สระว่ายน้ำ โรงอาหาร": ["18.75817", "99.01576"],
  "อาคาร 6 อาคารพลศึกษา ห้องสภานักเรียน": ["18.75739", "99.01538"],
  "อาคาร 7 อาคารมัธยมศึกษาตอนปลาย ห้องสมุด": ["18.75759", "99.01591"]
};

const buildingOptions = Object.keys(buildings).map(k => ({ label: k, value: k }));
buildingOptions.push({ label: 'อื่นๆ (กรอกเอง)', value: 'other' });

const defaultData = [
  { nameA: "อาคาร 1", latA: "18.75877", lngA: "99.01465", nameB: "อาคาร 3", latB: "18.75836", lngB: "99.01513", distance: "20", time: "20" },
  { nameA: "อาคาร 3", latA: "18.75836", lngA: "99.01513", nameB: "futsal", latB: "18.757955", lngB: "99.015097", distance: "15", time: "15" },
  { nameA: "futsal", latA: "18.757955", lngA: "99.015097", nameB: "สนามหญ้าจริง (safe zone)", latB: "18.757826", lngB: "99.014679", distance: "11", time: "11" },
  { nameA: "อาคาร 2", latA: "18.75891", lngA: "99.01526", nameB: "futsal", latB: "18.757955", lngB: "99.015097", distance: "20", time: "20" },
  { nameA: "อาคาร 1", latA: "18.75877", lngA: "99.01465", nameB: "อาคาร 2", latB: "18.75891", lngB: "99.01526", distance: "5", time: "5" },
  { nameA: "อาคาร 2", latA: "18.75891", lngA: "99.01526", nameB: "อาคาร 3", latB: "18.75836", lngB: "99.01513", distance: "20", time: "20" },
  { nameA: "อาคาร 4", latA: "18.75798", lngA: "99.01551", nameB: "futsal", latB: "18.757955", lngB: "99.015097", distance: "10", time: "10" },
  { nameA: "อาคาร 5", latA: "18.75817", lngA: "99.01576", nameB: "อาคาร 4", latB: "18.75798", lngB: "99.01551", distance: "12", time: "12" },
  { nameA: "อาคาร 6", latA: "18.75739", lngA: "99.01538", nameB: "สนามหญ้าจริง (safe zone)", latB: "18.757826", lngB: "99.014679", distance: "20", time: "20" },
  { nameA: "อาคาร 7", latA: "18.75759", lngA: "99.01591", nameB: "สนามบาสเก็ดบอล", latB: "18.757833", lngB: "99.015761", distance: "15", time: "15" },
];

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
const highlightPathNodes = ref([]);
const highlightPathEdges = ref([]);

const nodesGraph = ref({});
const edgesGraph = ref([]);

const isReadOnlyA = computed(() => form.selectedA && form.selectedA !== 'other');
const isReadOnlyB = computed(() => form.selectedB && form.selectedB !== 'other');

const graphNodeOptions = computed(() => Object.keys(nodesGraph.value).sort());

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

function saveData() {
  if (!form.nameA || !form.nameB || !form.distance || !form.time) {
    $q.notify({ type: 'warning', message: 'กรุณากรอกข้อมูลให้ครบ' });
    return;
  }
  const newData = {
    nameA: form.nameA, latA: form.latA, lngA: form.lngA,
    nameB: form.nameB, latB: form.latB, lngB: form.lngB,
    distance: form.distance, time: form.time
  };

  if (isEditing.value) {
    edgeList.value[editingIndex.value] = newData;
    $q.notify({ type: 'positive', message: 'แก้ไขข้อมูลเรียบร้อย' });
  } else {
    edgeList.value.push(newData);
    $q.notify({ type: 'positive', message: 'เพิ่มข้อมูลเรียบร้อย' });
  }

  saveToStorage();
  clearForm();
  updateGraph();
}

function editRow(row, idx) {
  if (idx < 0) {
      // Find index if passed by value but we need index for update logic
      idx = edgeList.value.indexOf(row);
  }
  editingIndex.value = idx;
  form.nameA = row.nameA; form.latA = row.latA; form.lngA = row.lngA;
  form.nameB = row.nameB; form.latB = row.latB; form.lngB = row.lngB;
  form.distance = row.distance; form.time = row.time;
  form.selectedA = buildings[row.nameA] ? row.nameA : 'other';
  form.selectedB = buildings[row.nameB] ? row.nameB : 'other';
}

function deleteData() {
  if (editingIndex.value === -1) return;
  if (confirm('ต้องการลบข้อมูลนี้หรือไม่?')) {
    edgeList.value.splice(editingIndex.value, 1);
    saveToStorage();
    clearForm();
    updateGraph();
    $q.notify({ type: 'negative', message: 'ลบข้อมูลแล้ว' });
  }
}

function saveToStorage() {
  localStorage.setItem('shortestPaths_v2', JSON.stringify(edgeList.value));
}

function loadFromStorage() {
  const str = localStorage.getItem('shortestPaths_v2');
  if (str) {
    edgeList.value = JSON.parse(str);
  } else {
    edgeList.value = [...defaultData];
    saveToStorage();
  }
  updateGraph();
}

function updateGraph() {
  const nodes = {};
  const edges = [];

  edgeList.value.forEach(e => {
    if(!nodes[e.nameA]) nodes[e.nameA] = { lat: parseFloat(e.latA), lng: parseFloat(e.lngA), x:0, y:0 };
    if(!nodes[e.nameB]) nodes[e.nameB] = { lat: parseFloat(e.latB), lng: parseFloat(e.lngB), x:0, y:0 };
    edges.push({ a: e.nameA, b: e.nameB, distance: parseFloat(e.distance), time: parseFloat(e.time) });
  });

  const padding = 50;
  const width = 800;
  const height = 550;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const names = Object.keys(nodes);

  if (names.length === 0) {
    nodesGraph.value = {};
    edgesGraph.value = [];
    return;
  }

  names.forEach(n => {
    const p = nodes[n];
    if(p.lat < minLat) minLat = p.lat;
    if(p.lat > maxLat) maxLat = p.lat;
    if(p.lng < minLng) minLng = p.lng;
    if(p.lng > maxLng) maxLng = p.lng;
  });

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  names.forEach(n => {
    const p = nodes[n];
    p.x = ((p.lng - minLng) / lngRange) * (width - 2 * padding) + padding;
    p.y = height - (((p.lat - minLat) / latRange) * (height - 2 * padding) + padding);
  });

  nodesGraph.value = nodes;
  edgesGraph.value = edges;
}

function getNodeX(name) { return nodesGraph.value[name]?.x || 0; }
function getNodeY(name) { return nodesGraph.value[name]?.y || 0; }

function runCalculation() {
  highlightPathNodes.value = [];
  highlightPathEdges.value = [];
  resultHtml.value = '';

  const start = calcStart.value;
  const end = calcEnd.value;

  if (!start || !end) {
    $q.notify({ type: 'warning', message: 'กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง' });
    return;
  }

  if (start === end) {
    resultHtml.value = `<div class="text-h6">จุดเดียวกัน (${start})</div>ระยะทาง 0`;
    highlightPathNodes.value = [start];
    return;
  }

  const adj = {};
  for(const n in nodesGraph.value) adj[n] = [];
  edgesGraph.value.forEach(e => {
    adj[e.a].push({ node: e.b, weight: e[calcWeight.value] });
    adj[e.b].push({ node: e.a, weight: e[calcWeight.value] });
  });

  const dist = {};
  const prev = {};
  const visited = new Set();
  for(const n in nodesGraph.value) dist[n] = Infinity;
  dist[start] = 0;

  while(true) {
    let u = null;
    let minDist = Infinity;
    for(const n in nodesGraph.value) {
      if(!visited.has(n) && dist[n] < minDist) {
        minDist = dist[n];
        u = n;
      }
    }

    if(u === null || u === end) break;
    visited.add(u);

    if(adj[u]) {
      adj[u].forEach(neighbor => {
        const alt = dist[u] + neighbor.weight;
        if(alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = u;
        }
      });
    }
  }

  if(dist[end] === Infinity) {
    resultHtml.value = 'ไม่พบเส้นทาง';
    return;
  }

  const path = [];
  let curr = end;
  while(curr) {
    path.unshift(curr);
    curr = prev[curr];
  }

  highlightPathNodes.value = path;

  const hEdges = [];
  for(let i=0; i<path.length-1; i++) {
    hEdges.push({ u: path[i], v: path[i+1] });
  }
  highlightPathEdges.value = hEdges;

  const unit = calcWeight.value === 'distance' ? 'เมตร' : 'นาที';
  resultHtml.value = `
    <div class="text-subtitle1">เส้นทางที่สั้นที่สุดจาก <strong>${start}</strong> ไป <strong>${end}</strong></div>
    <div class="text-body2 q-my-xs">เส้นทาง: ${path.join(' → ')}</div>
    <div class="text-h6 text-positive">ค่ารวมทั้งหมด: <strong>${dist[end]} ${unit}</strong></div>
  `;
}

function isNodeHighlighted(name) {
  return highlightPathNodes.value.includes(name);
}

function isEdgeDataHighlighted(edge) {
  return highlightPathEdges.value.some(pair =>
    (pair.u === edge.a && pair.v === edge.b) || (pair.u === edge.b && pair.v === edge.a)
  );
}

onMounted(() => {
  loadFromStorage();
});
</script>

<style scoped>
/* Graph Styles */
.canvas-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.edge {
  stroke: #cbd5e1;
  stroke-width: 2;
  transition: stroke 0.3s, stroke-width 0.3s;
}

.edge.highlight {
  stroke: #ef4444; /* red-500 */
  stroke-width: 4;
}

.edge-label {
  font-size: 11px;
  fill: #64748b;
  background: white; /* Does not work for SVG text, use Paint Order or separate bg rect if needed, but simple fill is fine */
}

.node {
  fill: #3b82f6; /* blue-500 */
  stroke: white;
  stroke-width: 2;
  transition: r 0.3s, fill 0.3s;
}

.node.highlight {
  fill: #10b981; /* green-500 */
  r: 9;
}

.node-label {
  font-size: 10px;
  fill: #334155;
  font-weight: 500;
}

/* Legend Box Helpers */
.legend-box {
  width: 24px;
  height: 4px;
  margin-right: 6px;
  border-radius: 2px;
}
.legend-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.edge-normal { background: #cbd5e1; }
.edge-high { background: #ef4444; }
.node-normal { background: #3b82f6; }
</style>
