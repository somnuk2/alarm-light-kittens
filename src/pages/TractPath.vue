<template>
  <div class="page-wrapper">
    <div class="container">
      <h1>🗺️ การนำทางบุคคลไปจุดปลอดภัย</h1>
      <p class="subtitle">โรงเรียนวารีเชียงใหม่ - ค้นหาเส้นทางปลอดภัยไปยังจุดหมาย</p>

      <!-- NAVIGATION SECTION -->
      <section class="navigation-card">
        <div class="nav-header">
          <h2 class="nav-title">📍 ระบบนำทาง</h2>
          <p class="nav-description">ค้นหาเส้นทางที่สั้นและปลอดภัยจากตำแหน่งปัจจุบัน</p>
        </div>

        <div class="nav-controls">
          <!-- Current Location -->
          <div class="location-input-group">
            <div class="location-badge current">
              <span class="badge-icon">📍</span>
              <div class="badge-content">
                <span class="badge-label">ตำแหน่งปัจจุบัน</span>
                <span class="badge-value" v-if="currentLocation">
                  {{ currentLocation.lat.toFixed(4) }}, {{ currentLocation.lng.toFixed(4) }}
                </span>
                <span class="badge-value empty" v-else>
                  {{ geoLoading ? '⏳ กำลังค้นหา...' : '❌ ยังไม่ได้ค้นหา' }}
                </span>
              </div>
            </div>
            <button
              @click="getCurrentLocation"
              :disabled="geoLoading"
              class="btn btn-locate"
              :class="{ loading: geoLoading }"
            >
              {{ geoLoading ? '⏳' : '🔄' }} {{ geoLoading ? 'กำลังค้นหา' : 'ค้นหาตำแหน่ง' }}
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
                <select
                  v-model="selectedDestination"
                  class="destination-select"
                >
                  <option :value="null">-- เลือกปลายทาง --</option>
                  <option v-for="name in graphNodeNames" :key="name" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
            </div>
            <button
              @click="startNavigation"
              :disabled="!currentLocation || !selectedDestination"
              class="btn btn-navigate"
            >
              ▶️ เริ่มนำทาง
            </button>
          </div>
        </div>

        <!-- Quick Access Buttons (Safe Locations) -->
        <div class="quick-access">
          <span class="quick-title">📌 สถานที่ปลอดภัย:</span>
          <div class="quick-buttons">
            <button
              v-for="place in safeLocations"
              :key="place"
              @click="selectedDestination = place"
              class="quick-btn"
            >
              {{ place }}
            </button>
          </div>
        </div>
      </section>

      <!-- ROUTE RESULT SECTION -->
      <transition name="slide-up">
        <section v-if="routeResult" class="route-result-card">
          <div class="result-header">
            <div class="result-title">
              <h3>🛤️ เส้นทางนำทาง</h3>
              <button @click="clearNavigation" class="btn-close">✕</button>
            </div>
            <div class="route-summary">
              <div class="summary-item">
                <span class="summary-icon">📏</span>
                <div class="summary-info">
                  <span class="summary-label">ระยะทาง</span>
                  <span class="summary-value">{{ routeResult.totalDistance }} เมตร</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="summary-icon">⏱️</span>
                <div class="summary-info">
                  <span class="summary-label">เวลาเดินทาง</span>
                  <span class="summary-value">{{ routeResult.totalTime }} นาที</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="summary-icon">👣</span>
                <div class="summary-info">
                  <span class="summary-label">จำนวนจุด</span>
                  <span class="summary-value">{{ routeResult.path.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step-by-Step Directions -->
          <div class="directions-container">
            <div class="directions-header">
              <h4>📋 ขั้นตอนการเดินทาง</h4>
            </div>

            <div class="directions-list">
              <div
                v-for="(step, idx) in routeResult.steps"
                :key="idx"
                class="direction-step"
                :class="{ 'is-active': activeStepIndex === idx }"
                @click="activeStepIndex = idx"
              >
                <div class="step-number">{{ idx + 1 }}</div>
                <div class="step-content">
                  <div class="step-from">{{ step.from }}</div>
                  <div class="step-route">
                    <span class="route-arrow">→</span>
                  </div>
                  <div class="step-to">{{ step.to }}</div>
                </div>
                <div class="step-details">
                  <span class="detail-distance">{{ step.distance }}ม.</span>
                  <span class="detail-time">{{ step.time }}นาที</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Route Path Visualization -->
          <div class="route-path-viz">
            <div class="path-title">🗓️ เส้นทางทั้งหมด:</div>
            <div class="path-chain">
              <span v-for="(node, idx) in routeResult.path" :key="idx" class="path-node">
                <span class="node-badge">{{ idx + 1 }}</span>
                <span class="node-name">{{ node }}</span>
                <span v-if="idx < routeResult.path.length - 1" class="chain-arrow">→</span>
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="result-actions">
            <button @click="copyRoute" class="btn btn-secondary">
              📋 คัดลอกเส้นทาง
            </button>
            <button @click="printRoute" class="btn btn-secondary">
              🖨️ พิมพ์เส้นทาง
            </button>
            <button @click="shareRoute" class="btn btn-secondary">
              📤 แชร์เส้นทาง
            </button>
          </div>
        </section>
      </transition>

      <!-- GRAPH VISUALIZATION SECTION -->
      <section class="graph-section">
        <h2 class="section-title">📊 แผนที่กราฟและคำนวณเส้นทาง</h2>
        <p class="section-subtitle">เลือกจุดเริ่มต้นและปลายทาง หรือใช้ค่าเริ่มต้นจากนำทาง</p>

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
            🔍 คำนวณเส้นทาง
          </button>
        </div>

        <!-- Result -->
        <div
          class="result-box"
          v-html="resultHtml || 'ยังไม่มีการคำนวณเส้นทาง เลือกจุดเริ่มต้นและปลายทางแล้วกดปุ่ม'"
        ></div>

        <!-- SVG Graph -->
        <div class="canvas-wrapper">
          <svg id="graph" viewBox="0 0 800 550" class="svg-graph">
            <!-- Lines/Edges -->
            <line
              v-for="(edge, idx) in edgesGraph"
              :key="'e-' + idx"
              :x1="getNodeX(edge.a)"
              :y1="getNodeY(edge.a)"
              :x2="getNodeX(edge.b)"
              :y2="getNodeY(edge.b)"
              class="edge"
              :class="{ highlight: isEdgeDataHighlighted(edge) }"
            />
            <!-- Edge Labels -->
            <text
              v-for="(edge, idx) in edgesGraph"
              :key="'t-' + idx"
              :x="(getNodeX(edge.a) + getNodeX(edge.b)) / 2"
              :y="(getNodeY(edge.a) + getNodeY(edge.b)) / 2 - 4"
              class="edge-label"
              text-anchor="middle"
            >
              {{ edge.distance }}ม
            </text>

            <!-- Nodes/Circles -->
            <g v-for="(node, name) in nodesGraph" :key="'n-' + name">
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

      <!-- CRUD SECTION (Collapsed by default) -->
      <details class="crud-section">
        <summary class="crud-summary">
          <span class="summary-icon">⚙️</span>
          <span>จัดการข้อมูลเส้นทาง (CRUD)</span>
        </summary>

        <!-- Form -->
        <div class="form-section">
          <h3 class="form-title">เพิ่มหรือแก้ไขข้อมูลเส้นทาง</h3>

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
                placeholder="ชื่ออาคาร A"
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
                placeholder="ชื่ออาคาร B"
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
              {{ isEditing ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มข้อมูล' }}
            </button>
            <button v-if="isEditing" @click="deleteData" class="btn btn-danger">
              🗑️ ลบ
            </button>
            <button v-if="isEditing" @click="clearForm" class="btn btn-secondary">
              ❌ ยกเลิก
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="table-section">
          <h3 class="section-title">รายการเส้นทางทั้งหมด</h3>
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
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from 'boot/axios';
import { SHARED_LOCATIONS, SHARED_EDGES } from '../constants/locations';

// ===== SAFE LOCATIONS (เสริม) =====
const safeLocations = [
  'สนามหญ้าจริง (safe zone)',
  'อาคารอำนวยการ',
  'โรงอาหาร'
];

// ===== NAVIGATION STATE =====
const currentLocation = ref(null);
const geoLoading = ref(false);
const selectedDestination = ref(null);
const routeResult = ref(null);
const activeStepIndex = ref(0);

// ===== BUILDING DATA =====
const buildings = {};
SHARED_LOCATIONS.forEach(loc => {
  buildings[loc.name] = [loc.lat.toString(), loc.lng.toString()];
});

const buildingOptions = Object.keys(buildings).map((k) => ({ label: k, value: k }));
buildingOptions.push({ label: 'อื่นๆ (กรอกเอง)', value: 'other' });

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

// ===== REACTIVE STATE =====
const edgeList = ref([]);
const editingIndex = ref(-1);
const isEditing = computed(() => editingIndex.value !== -1);

const form = reactive({
  selectedA: null,
  nameA: '',
  latA: '',
  lngA: '',
  selectedB: null,
  nameB: '',
  latB: '',
  lngB: '',
  distance: '',
  time: ''
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

// ===== NAVIGATION METHODS =====
function getCurrentLocation() {
  geoLoading.value = true;

  if (!navigator.geolocation) {
    alert('⚠️ เบราว์เซอร์ของคุณไม่รองรับ Geolocation');
    geoLoading.value = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      currentLocation.value = { lat: latitude, lng: longitude };
      geoLoading.value = false;
    },
    (error) => {
      console.error('Geolocation error:', error);
      alert('⚠️ ไม่สามารถค้นหาตำแหน่งปัจจุบัน');
      geoLoading.value = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function startNavigation() {
  if (!currentLocation.value || !selectedDestination.value) {
    alert('⚠️ กรุณาค้นหาตำแหน่งปัจจุบันและเลือกปลายทาง');
    return;
  }

  // Find nearest location
  const start = findNearestLocation(currentLocation.value);
  const end = selectedDestination.value;

  if (!start) {
    alert('⚠️ ไม่พบตำแหน่งใกล้เคียง');
    return;
  }

  // Set and calculate
  calcStart.value = start;
  calcEnd.value = end;
  calcWeight.value = 'distance';

  runCalculation();

  // Build route result
  if (highlightPathNodes.value.length > 0) {
    generateRouteResult(highlightPathNodes.value);
    activeStepIndex.value = 0;
  }
}

function findNearestLocation(location) {
  let nearest = null;
  let minDistance = Infinity;

  for (const name in nodesGraph.value) {
    const node = nodesGraph.value[name];
    const distance =
      Math.pow(node.lat - location.lat, 2) + Math.pow(node.lng - location.lng, 2);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = name;
    }
  }

  return nearest;
}

function generateRouteResult(path) {
  const steps = [];
  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    const edgeData = edgeList.value.find(
      (e) => (e.nameA === from && e.nameB === to) || (e.nameA === to && e.nameB === from)
    );

    if (edgeData) {
      steps.push({
        from,
        to,
        distance: edgeData.distance,
        time: edgeData.time
      });
      totalDistance += parseFloat(edgeData.distance);
      totalTime += parseFloat(edgeData.time);
    }
  }

  routeResult.value = {
    path,
    steps,
    totalDistance: Math.round(totalDistance),
    totalTime: Math.round(totalTime)
  };
}

function clearNavigation() {
  routeResult.value = null;
  selectedDestination.value = null;
  calcStart.value = null;
  calcEnd.value = null;
  highlightPathNodes.value = [];
  highlightPathEdges.value = [];
  resultHtml.value = '';
}

function copyRoute() {
  if (!routeResult.value) return;

  const text = `เส้นทางนำทาง
🗺️ เส้นทาง: ${routeResult.value.path.join(' → ')}
📏 ระยะทาง: ${routeResult.value.totalDistance} เมตร
⏱️ เวลา: ${routeResult.value.totalTime} นาที

ขั้นตอน:
${routeResult.value.steps
  .map(
    (s, i) =>
      `${i + 1}. ${s.from} → ${s.to} (${s.distance}ม., ${s.time}นาที)`
  )
  .join('\n')}`;

  navigator.clipboard.writeText(text).then(() => {
    alert('✅ คัดลอกเส้นทางสำเร็จ');
  });
}

function printRoute() {
  if (!routeResult.value) return;

  const printWindow = window.open('', '', 'width=900,height=600');
  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>เส้นทางนำทาง</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 30px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        h1 { color: #2563eb; text-align: center; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .summary-item { padding: 15px; background: #f0f3fa; border-radius: 8px; border-left: 4px solid #2563eb; }
        .summary-item strong { display: block; color: #2563eb; }
        .summary-item span { font-size: 24px; font-weight: bold; }
        h2 { color: #1a202c; margin-top: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #2563eb; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9fafb; }
        .path { margin-top: 15px; padding: 15px; background: #eff6ff; border-radius: 8px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🗺️ เส้นทางนำทาง</h1>

        <div class="summary">
          <div class="summary-item">
            <strong>📏 ระยะทาง</strong>
            <span>${routeResult.value.totalDistance}</span> เมตร
          </div>
          <div class="summary-item">
            <strong>⏱️ เวลา</strong>
            <span>${routeResult.value.totalTime}</span> นาที
          </div>
          <div class="summary-item">
            <strong>👣 จำนวนจุด</strong>
            <span>${routeResult.value.path.length}</span> จุด
          </div>
        </div>

        <div class="path">
          <strong>🛤️ เส้นทางทั้งหมด:</strong><br>
          ${routeResult.value.path.join(' → ')}
        </div>

        <h2>📋 ขั้นตอนการเดินทาง</h2>
        <table>
          <tr>
            <th>ลำดับ</th>
            <th>จาก</th>
            <th>ไป</th>
            <th>ระยะ</th>
            <th>เวลา</th>
          </tr>
          ${routeResult.value.steps
            .map(
              (s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${s.from}</strong></td>
              <td><strong>${s.to}</strong></td>
              <td>${s.distance}ม.</td>
              <td>${s.time}นาที</td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
}

function shareRoute() {
  if (!routeResult.value) return;

  const text = `🗺️ เส้นทางนำทาง: ${routeResult.value.path.join(
    ' → '
  )}\n📏 ระยะทาง: ${routeResult.value.totalDistance}ม. | ⏱️ เวลา: ${
    routeResult.value.totalTime
  }นาที`;

  if (navigator.share) {
    navigator
      .share({
        title: 'เส้นทางนำทาง',
        text
      })
      .catch((err) => console.log('Share error:', err));
  } else {
    alert('✅ แชร์ไม่รองรับในเบราว์เซอร์นี้\n' + text);
  }
}

// ===== CRUD METHODS =====
function onSelectA(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameA = val;
    form.latA = lat;
    form.lngA = lng;
  } else {
    form.nameA = '';
    form.latA = '';
    form.lngA = '';
  }
}

function onSelectB(val) {
  if (val && val !== 'other') {
    const [lat, lng] = buildings[val];
    form.nameB = val;
    form.latB = lat;
    form.lngB = lng;
  } else {
    form.nameB = '';
    form.latB = '';
    form.lngB = '';
  }
}

function clearForm() {
  form.selectedA = null;
  form.nameA = '';
  form.latA = '';
  form.lngA = '';
  form.selectedB = null;
  form.nameB = '';
  form.latB = '';
  form.lngB = '';
  form.distance = '';
  form.time = '';
  editingIndex.value = -1;
}

async function saveData() {
  if (!form.nameA || !form.nameB || !form.distance || !form.time) {
    alert('⚠️ กรุณากรอกข้อมูลให้ครบ');
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
      alert('✅ แก้ไขข้อมูลเรียบร้อย');
    } else {
      const resp = await api.post('/api/edges', newData);
      edgeList.value.push(resp.data);
      alert('✅ เพิ่มข้อมูลเรียบร้อย');
    }

    clearForm();
    updateGraph();
  } catch (error) {
    console.error('Error saving edge:', error);
    alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  }
}

function editRow(row, idx) {
  editingIndex.value = idx;
  form.nameA = row.nameA;
  form.latA = row.latA;
  form.lngA = row.lngA;
  form.nameB = row.nameB;
  form.latB = row.latB;
  form.lngB = row.lngB;
  form.distance = row.distance;
  form.time = row.time;
  form.selectedA = buildings[row.nameA] ? row.nameA : 'other';
  form.selectedB = buildings[row.nameB] ? row.nameB : 'other';
}

async function deleteData() {
  if (editingIndex.value === -1) return;
  const item = edgeList.value[editingIndex.value];

  if (confirm(`ต้องการลบเส้นทาง ${item.nameA} - ${item.nameB} หรือไม่?`)) {
    try {
      await api.delete(`/api/edges/${item.id}`);
      edgeList.value.splice(editingIndex.value, 1);
      clearForm();
      updateGraph();
      alert('🗑️ ลบข้อมูลแล้ว');
    } catch (error) {
       console.error('Error deleting edge:', error);
       alert('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  }
}

async function loadFromBackend() {
  try {
    const resp = await api.get('/api/edges');
    if (resp.data && resp.data.length > 0) {
      edgeList.value = resp.data;
    } else {
      edgeList.value = [...defaultData];
    }
  } catch (error) {
    console.error('Error loading edges:', error);
    edgeList.value = [...defaultData];
  }
  updateGraph();
}

function updateGraph() {
  const nodes = {};
  const edges = [];

  edgeList.value.forEach((e) => {
    if (!nodes[e.nameA])
      nodes[e.nameA] = { lat: parseFloat(e.latA), lng: parseFloat(e.lngA), x: 0, y: 0 };
    if (!nodes[e.nameB])
      nodes[e.nameB] = { lat: parseFloat(e.latB), lng: parseFloat(e.lngB), x: 0, y: 0 };
    edges.push({
      a: e.nameA,
      b: e.nameB,
      distance: parseFloat(e.distance),
      time: parseFloat(e.time)
    });
  });

  const padding = 50;
  const width = 800;
  const height = 550;

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  const names = Object.keys(nodes);

  if (names.length === 0) {
    nodesGraph.value = {};
    edgesGraph.value = [];
    return;
  }

  names.forEach((n) => {
    const p = nodes[n];
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  names.forEach((n) => {
    const p = nodes[n];
    p.x = ((p.lng - minLng) / lngRange) * (width - 2 * padding) + padding;
    p.y = height - (((p.lat - minLat) / latRange) * (height - 2 * padding) + padding);
  });

  nodesGraph.value = nodes;
  edgesGraph.value = edges;
}

const graphNodeNames = computed(() => Object.keys(nodesGraph.value).sort());

function getNodeX(name) {
  return nodesGraph.value[name]?.x || 0;
}
function getNodeY(name) {
  return nodesGraph.value[name]?.y || 0;
}

function runCalculation() {
  highlightPathNodes.value = [];
  highlightPathEdges.value = [];
  resultHtml.value = '';

  const start = calcStart.value;
  const end = calcEnd.value;

  if (!start || !end) {
    resultHtml.value = '⚠️ กรุณาเลือกจุดเริ่มต้นและจุดปลายทาง';
    return;
  }

  if (start === end) {
    resultHtml.value = `✅ จุดเดียวกัน (${start}) ระยะทาง 0`;
    highlightPathNodes.value = [start];
    return;
  }

  const adj = {};
  for (const n in nodesGraph.value) adj[n] = [];
  edgesGraph.value.forEach((e) => {
    adj[e.a].push({ node: e.b, weight: e[calcWeight.value] });
    adj[e.b].push({ node: e.a, weight: e[calcWeight.value] });
  });

  const dist = {};
  const prev = {};
  const visited = new Set();
  for (const n in nodesGraph.value) dist[n] = Infinity;
  dist[start] = 0;

  while (true) {
    let u = null;
    let minDist = Infinity;
    for (const n in nodesGraph.value) {
      if (!visited.has(n) && dist[n] < minDist) {
        minDist = dist[n];
        u = n;
      }
    }

    if (u === null || u === end) break;
    visited.add(u);

    if (adj[u]) {
      adj[u].forEach((neighbor) => {
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = u;
        }
      });
    }
  }

  if (dist[end] === Infinity) {
    resultHtml.value = '❌ ไม่พบเส้นทาง';
    return;
  }

  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }

  highlightPathNodes.value = path;

  const hEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    hEdges.push({ u: path[i], v: path[i + 1] });
  }
  highlightPathEdges.value = hEdges;

  const unit = calcWeight.value === 'distance' ? 'เมตร' : 'นาที';
  resultHtml.value = `
    ✅ เส้นทางที่สั้นที่สุดจาก <strong>${start}</strong> ไป <strong>${end}</strong><br>
    🛤️ เส้นทาง: ${path.join(' → ')}<br>
    📊 ค่ารวมทั้งหมด: <strong>${dist[end]} ${unit}</strong>
  `;
}

function isNodeHighlighted(name) {
  return highlightPathNodes.value.includes(name);
}

function isEdgeDataHighlighted(edge) {
  return highlightPathEdges.value.some(
    (pair) =>
      (pair.u === edge.a && pair.v === edge.b) ||
      (pair.u === edge.b && pair.v === edge.a)
  );
}

onMounted(() => {
  loadFromBackend();
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

/* ===== LAYOUT ===== */
.page-wrapper {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f7fb;
  color: #222;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  text-align: center;
  color: #1a202c;
  font-weight: 700;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0 0 32px 0;
}

/* ===== NAVIGATION CARD ===== */
.navigation-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  color: white;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
}

.nav-header {
  text-align: center;
  margin-bottom: 28px;
}

.nav-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.nav-description {
  margin: 8px 0 0 0;
  font-size: 0.95rem;
  opacity: 0.95;
}

.nav-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

/* Location badges */
.location-input-group {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.location-badge {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.location-badge.current {
  min-width: 300px;
}

.badge-icon {
  font-size: 1.8rem;
}

.badge-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.badge-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.8;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.badge-value {
  font-size: 0.95rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.badge-value.empty {
  opacity: 0.8;
}

.destination-select {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #222;
  cursor: pointer;
  transition: all 0.2s ease;
}

.destination-select:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

/* Nav buttons */
.btn-locate,
.btn-navigate {
  padding: 10px 16px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-locate:hover:not(:disabled),
.btn-navigate:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.btn-locate:disabled,
.btn-navigate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-locate.loading {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.nav-arrow {
  text-align: center;
  font-size: 1.5rem;
  opacity: 0.7;
}

/* ===== QUICK ACCESS ===== */
.quick-access {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.quick-title {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.quick-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.quick-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

/* ===== ROUTE RESULT CARD ===== */
.route-result-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 28px;
  margin-bottom: 32px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.result-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.result-title h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #1a202c;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #1a202c;
}

/* Route summary */
.route-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  width: 100%;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #f0f3fa 100%);
  border-radius: 12px;
  border-left: 4px solid #2563eb;
}

.summary-icon {
  font-size: 1.8rem;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
}

.summary-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2563eb;
}

/* Directions list */
.directions-container {
  margin-bottom: 24px;
}

.directions-header {
  margin-bottom: 16px;
}

.directions-header h4 {
  margin: 0;
  font-size: 1.05rem;
  color: #1a202c;
}

.directions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.direction-step {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-left: 4px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.direction-step:hover {
  background: #f0f3fa;
  border-left-color: #2563eb;
}

.direction-step.is-active {
  background: #eff6ff;
  border-left-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
}

.step-content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.step-from,
.step-to {
  font-weight: 600;
  color: #1a202c;
  font-size: 0.9rem;
}

.route-arrow {
  color: #d1d5db;
  font-weight: bold;
}

.step-details {
  display: flex;
  gap: 12px;
  padding-left: 8px;
  border-left: 1px solid #e5e7eb;
}

.detail-distance,
.detail-time {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

/* Route path visual */
.route-path-viz {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.path-title {
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 12px 0;
}

.path-chain {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.path-node {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}

.node-name {
  padding: 4px 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1a202c;
}

.chain-arrow {
  color: #d1d5db;
  font-weight: bold;
}

/* Result actions */
.result-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.result-actions .btn {
  flex: 1;
}

/* ===== GRAPH SECTION ===== */
.graph-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}

.section-title {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 0 0 16px 0;
  font-size: 0.9rem;
  color: #6b7280;
}

/* Calculator controls */
.calculator-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
}

.control-group {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-box {
  margin-top: 4px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px dashed #93c5fd;
  font-size: 0.9rem;
  color: #1e3a8a;
}

/* Graph canvas */
.canvas-wrapper {
  margin-top: 8px;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.svg-graph {
  width: 100%;
  max-width: 100%;
  display: block;
  border-radius: 8px;
  background: #f9fafb;
}

/* Edges and nodes */
.edge {
  stroke: #9ca3af;
  stroke-width: 2;
}

.edge.highlight {
  stroke: #2563eb;
  stroke-width: 3;
}

.edge-label {
  font-size: 0.75rem;
  fill: #4b5563;
}

.node {
  fill: #ffffff;
  stroke: #2563eb;
  stroke-width: 2;
}

.node.highlight {
  fill: #2563eb;
  stroke: #1d4ed8;
}

.node-label {
  font-size: 0.75rem;
  fill: #111827;
  font-weight: 600;
}

/* Legend */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: #4b5563;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-line,
.legend-line-highlight {
  width: 28px;
  height: 3px;
  border-radius: 999px;
}

.legend-line {
  background: #9ca3af;
}

.legend-line-highlight {
  background: #2563eb;
}

.legend-node,
.legend-node-highlight {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
}

.legend-node {
  background: #ffffff;
  border-color: #2563eb;
}

.legend-node-highlight {
  background: #2563eb;
  border-color: #1d4ed8;
}

/* ===== CRUD SECTION & TABLE ===== */
.crud-section {
  margin-top: 24px;
}

.crud-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #eef2ff;
  border-radius: 8px;
  cursor: pointer;
  list-style: none;
  font-weight: 500;
  color: #1d4ed8;
}

.crud-summary::-webkit-details-marker {
  display: none;
}

.summary-icon {
  font-size: 1.1rem;
}

/* Form & table reused */
.form-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  margin-bottom: 24px;
}

.form-title {
  font-size: 1.05rem;
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
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input:readonly,
.form-input:disabled {
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

/* Table */
.table-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin-top: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table thead {
  background: #eef2ff;
}

.data-table th,
.data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.data-table th {
  font-weight: 600;
  color: #374151;
  text-align: left;
}

.table-row:hover {
  background: #f9fafb;
}

.text-center {
  text-align: center;
}

.btn-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #2563eb;
  font-size: 0.85rem;
  text-decoration: underline;
}

/* ===== BUTTONS (GLOBAL) ===== */
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
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease,
    opacity 0.1s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
  background: #1d4ed8;
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.4);
}

.btn-secondary {
  background: #6b7280;
  color: #fff;
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(107, 114, 128, 0.5);
  background: #4b5563;
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(107, 114, 128, 0.4);
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.5);
  background: #b91c1c;
}

.btn-danger:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(220, 38, 38, 0.4);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .result-header {
    flex-direction: column;
  }

  .route-summary {
    grid-template-columns: 1fr;
  }

  .location-input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .location-badge.current {
    min-width: 0;
  }

  .calculator-controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
