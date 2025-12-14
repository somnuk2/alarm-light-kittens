<template>
  <div class="page-wrapper">
    <div class="container">
      <h1>ระบบบันทึกเส้นทางสั้นที่สุดระหว่างอาคาร (V2)</h1>
      <p class="subtitle">โรงเรียนวารีเชียงใหม่ - การศึกษาเพื่ออนาคตก้าวไกล</p>

      <!-- CRUD Form -->
      <div class="form-section">
        <h2 class="form-title">เพิ่มหรือแก้ไขข้อมูลเส้นทาง</h2>

        <div class="form-grid">
          <!-- Building A -->
          <div class="form-group">
            <label>อาคาร A</label>
            <select
              v-model="form.selectedA"
              class="form-input"
              @change="onSelectA(form.selectedA)"
            >
              <option :value="null">-- เลือกอาคาร A --</option>
              <option v-for="opt in buildingOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-model="form.nameA"
              type="text"
              placeholder="ชื่ออาคาร A (ถ้าเลือกอื่นๆ)"
              class="form-input mt-2"
              :readonly="isReadOnlyA"
            />
            <div class="form-row">
              <input
                v-model="form.latA"
                type="text"
                placeholder="Latitude"
                class="form-input"
                :readonly="isReadOnlyA"
              />
              <input
                v-model="form.lngA"
                type="text"
                placeholder="Longitude"
                class="form-input"
                :readonly="isReadOnlyA"
              />
            </div>
          </div>

          <!-- Building B -->
          <div class="form-group">
            <label>อาคาร B</label>
            <select
              v-model="form.selectedB"
              class="form-input"
              @change="onSelectB(form.selectedB)"
            >
              <option :value="null">-- เลือกอาคาร B --</option>
              <option v-for="opt in buildingOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-model="form.nameB"
              type="text"
              placeholder="ชื่ออาคาร B (ถ้าเลือกอื่นๆ)"
              class="form-input mt-2"
              :readonly="isReadOnlyB"
            />
            <div class="form-row">
              <input
                v-model="form.latB"
                type="text"
                placeholder="Latitude"
                class="form-input"
                :readonly="isReadOnlyB"
              />
              <input
                v-model="form.lngB"
                type="text"
                placeholder="Longitude"
                class="form-input"
                :readonly="isReadOnlyB"
              />
            </div>
          </div>
        </div>

        <!-- Distance & Time -->
        <div class="form-grid">
          <div class="form-group">
            <label>ระยะห่าง (เมตร)</label>
            <input
              v-model="form.distance"
              type="number"
              placeholder="เช่น 20"
              class="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div class="form-group">
            <label>เวลาเดินทาง (นาที)</label>
            <input
              v-model="form.time"
              type="number"
              placeholder="เช่น 5"
              class="form-input"
              min="0"
            />
          </div>
        </div>

        <!-- Buttons -->
        <div class="button-group">
          <button @click="saveData" class="btn btn-primary">
            {{ isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล' }}
          </button>
          <button v-if="isEditing" @click="deleteData" class="btn btn-danger">
            ลบ
          </button>
          <button v-if="isEditing" @click="clearForm" class="btn btn-secondary">
            ยกเลิก
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-section">
        <h2 class="section-title">รายการเส้นทางทั้งหมด</h2>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>อาคาร A</th>
                <th>Lat A</th>
                <th>Lng A</th>
                <th>อาคาร B</th>
                <th>Lat B</th>
                <th>Lng B</th>
                <th>ระยะ (ม.)</th>
                <th>เวลา (นาที)</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in edgeList"
                :key="index"
                class="table-row"
                @click="editRow(item, index)"
              >
                <td>{{ item.nameA }}</td>
                <td>{{ item.latA }}</td>
                <td>{{ item.lngA }}</td>
                <td>{{ item.nameB }}</td>
                <td>{{ item.latB }}</td>
                <td>{{ item.lngB }}</td>
                <td class="text-center">{{ item.distance }}</td>
                <td class="text-center">{{ item.time }}</td>
                <td class="text-center">
                  <button class="btn-link" @click.stop="editRow(item, index)">เลือก</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Graph & Calculator -->
      <section class="graph-section">
        <h2 class="section-title">แสดงกราฟและหาเส้นทางที่สั้นที่สุด</h2>
        <p class="section-subtitle">กราฟอัปเดตอัตโนมัติตามข้อมูลในตาราง</p>

        <!-- Calculator Controls -->
        <div class="calculator-controls">
          <div class="control-group">
            <label>จุดเริ่มต้น</label>
            <select v-model="calcStart" class="form-input">
              <option :value="null">-- เลือก --</option>
              <option v-for="name in graphNodeNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>
          <div class="control-group">
            <label>จุดปลายทาง</label>
            <select v-model="calcEnd" class="form-input">
              <option :value="null">-- เลือก --</option>
              <option v-for="name in graphNodeNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>
          <div class="control-group">
            <label>เกณฑ์</label>
            <select v-model="calcWeight" class="form-input">
              <option value="distance">ระยะทาง (เมตร)</option>
              <option value="time">เวลา (นาที)</option>
            </select>
          </div>
          <button @click="runCalculation" class="btn btn-primary">
            คำนวณเส้นทาง
          </button>
        </div>

        <!-- Result -->
        <div class="result-box" v-html="resultHtml || 'ยังไม่มีการคำนวณเส้นทาง เลือกจุดเริ่มต้นและปลายทางแล้วกดปุ่ม'"></div>

        <!-- SVG Graph -->
        <div class="canvas-wrapper">
          <svg id="graph" viewBox="0 0 800 550">
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

            <!-- Circles -->
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

          <!-- Legend -->
          <div class="legend">
            <div class="legend-item">
              <div class="legend-line"></div>
              <span>เส้นเชื่อมปกติ</span>
            </div>
            <div class="legend-item">
              <div class="legend-line-highlight"></div>
              <span>เส้นทางที่สั้นที่สุด</span>
            </div>
            <div class="legend-item">
              <div class="legend-node"></div>
              <span>โหนด</span>
            </div>
            <div class="legend-item">
              <div class="legend-node-highlight"></div>
              <span>โหนดในเส้นทาง</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

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

const zoomLevel = ref(1);
const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);

const isReadOnlyA = computed(() => form.selectedA && form.selectedA !== 'other');
const isReadOnlyB = computed(() => form.selectedB && form.selectedB !== 'other');

// Methods
function onSelectA(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameA = val;
    form.latA = lat;
    form.lngA = lng;
  } else {
    form.nameA = ''; form.latA = ''; form.lngA = '';
  }
}

function onSelectB(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameB = val;
    form.latB = lat;
    form.lngB = lng;
  } else {
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
    alert('กรุณากรอกข้อมูลให้ครบ');
    return;
  }
  const newData = { ...form };
  delete newData.selectedA;
  delete newData.selectedB;

  if (isEditing.value) {
    edgeList.value[editingIndex.value] = newData;
  } else {
    edgeList.value.push(newData);
  }

  saveToStorage();
  clearForm();
  updateGraph();
}

function editRow(row, idx) {
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

const graphNodeNames = computed(() => Object.keys(nodesGraph.value).sort());

function getNodeX(name) { return nodesGraph.value[name]?.x || 0; }
function getNodeY(name) { return nodesGraph.value[name]?.y || 0; }

function runCalculation() {
  highlightPathNodes.value = [];
  highlightPathEdges.value = [];
  resultHtml.value = '';

  const start = calcStart.value;
  const end = calcEnd.value;

  if (!start || !end) {
    resultHtml.value = 'กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง';
    return;
  }

  if (start === end) {
    resultHtml.value = `จุดเดียวกัน (${start}) ระยะทาง 0`;
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
    เส้นทางที่สั้นที่สุดจาก <strong>${start}</strong> ไป <strong>${end}</strong><br>
    เส้นทาง: ${path.join(' → ')}<br>
    ค่ารวมทั้งหมด: <strong>${dist[end]} ${unit}</strong>
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
* {
  box-sizing: border-box;
}

.page-wrapper {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f7fb;
  color: #222;
}

.container {
  max-width: 1100px;
  margin: 24px auto;
  padding: 0 16px;
}

h1 {
  margin-top: 0;
  margin-bottom: 4px;
  font-size: 1.5rem;
  text-align: center;
  color: #1a202c;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 24px;
}

/* Form Section */
.form-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
}

.form-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 16px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #c7d2e5;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input:disabled,
.form-input:readonly {
  background: #f3f4f6;
  color: #9ca3af;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mt-2 {
  margin-top: 8px !important;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
  white-space: nowrap;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
  background: #1d4ed8;
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.4);
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.5);
  background: #b91c1c;
}

.btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(220, 38, 38, 0.4);
}

.btn-secondary {
  background: #6b7280;
  color: #fff;
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(107, 114, 128, 0.5);
  background: #4b5563;
}

.btn-secondary:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(107, 114, 128, 0.4);
}

.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-link:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

/* Table Section */
.table-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
  overflow: hidden;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 16px 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #2563eb;
  color: #fff;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s ease;
}

.table-row {
  cursor: pointer;
}

.table-row:hover {
  background-color: #f3f4f6;
}

.data-table td {
  padding: 12px 16px;
  font-size: 0.9rem;
}

.text-center {
  text-align: center;
}

/* Graph Section */
.graph-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.calculator-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f3fa;
  border-radius: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  min-width: 160px;
}

.control-group label {
  margin-bottom: 4px;
  color: #555;
  font-weight: 500;
}

/* Result Box */
.result-box {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #1e40af;
}

/* Canvas */
.canvas-wrapper {
  margin-top: 20px;
  padding: 16px;
  border-radius: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

#graph {
  width: 100%;
  height: 550px;
  background: #ffffff;
  border-radius: 12px;
}

.edge {
  stroke: #cbd5e1;
  stroke-width: 2;
  transition: stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease;
}

.edge-label {
  font-size: 0.7rem;
  fill: #6b7280;
  pointer-events: none;
}

.node {
  fill: #0ea5e9;
  stroke: #e0f2fe;
  stroke-width: 3;
  transition: fill 0.15s ease, r 0.15s ease, stroke-width 0.15s ease;
}

.node-label {
  font-size: 0.75rem;
  fill: #111827;
  text-shadow: 0 1px 2px #fff;
  pointer-events: none;
}

.edge.highlight {
  stroke: #2563eb;
  stroke-width: 4;
  opacity: 0.95;
}

.node.highlight {
  fill: #f97316;
  stroke-width: 4;
  r: 9;
}

/* Legend */
.legend {
  margin-top: 12px;
  font-size: 0.8rem;
  color: #6b7280;
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  padding: 0 4px;
  justify-content: center;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-line,
.legend-line-highlight {
  width: 30px;
  height: 3px;
  border-radius: 999px;
}

.legend-line {
  background: #cbd5e1;
}

.legend-line-highlight {
  background: #2563eb;
}

.legend-node,
.legend-node-highlight {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.legend-node {
  background: #0ea5e9;
  border: 2px solid #e0f2fe;
}

.legend-node-highlight {
  background: #f97316;
  border: 2px solid #fed7aa;
}
</style>
