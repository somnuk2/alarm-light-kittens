<template>
  <div class="page-wrapper">
    <div class="container">
      <h1>แผนที่ระบุตำแหน่งอาคาร (Northern Thailand)</h1>
      <p class="subtitle">โรงเรียนวารีเชียงใหม่ - การศึกษาเพื่ออนาคตก้าวไกล</p>

      <!-- Main Layout: Left = Form, Right = Map -->
      <div class="main-grid">
        <!-- FORM SECTION -->
        <section class="form-section">
          <h2 class="form-title">
            <span class="title-badge">1</span>
            ฟอร์มบันทึกตำแหน่งอาคาร (Marker Form)
          </h2>

          <div class="form-content">
            <!-- Place Name -->
            <div class="form-group">
              <label>ชื่อสถานที่ / อาคาร (Building-Place)</label>
              <input
                v-model="placeName"
                type="text"
                class="form-input"
                placeholder="เช่น อาคารที่ 1, futsal, สนามหญ้าจริง"
              />
            </div>

            <!-- Latitude / Longitude -->
            <div class="form-grid">
              <div class="form-group">
                <label>Latitude</label>
                <input
                  v-model.number="lat"
                  type="number"
                  step="0.000001"
                  class="form-input"
                  placeholder="18.758769"
                />
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input
                  v-model.number="lng"
                  type="number"
                  step="0.000001"
                  class="form-input"
                  placeholder="99.014645"
                />
              </div>
            </div>

            <!-- Address for geocoding -->
            <div class="form-group">
              <label>ที่อยู่ / สถานที่ (ใช้ Geocoding – Nominatim)</label>
              <input
                v-model="address"
                type="text"
                class="form-input"
                placeholder="เช่น โรงเรียนวารี จังหวัดเชียงใหม่"
                @keyup.enter="handleGeocode"
              />
              <p class="form-hint">
                ระบบจะเรียกใช้บริการ Nominatim (OpenStreetMap) และแคชพิกัดไว้ใน Local Storage
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="button-group">
              <button
                @click="handleGeocode"
                :disabled="isGeocoding"
                class="btn btn-primary"
              >
                {{ isGeocoding ? 'กำลังค้นหาพิกัด...' : 'ค้นหา Lat/Lng' }}
              </button>
              <button @click="handleAddMarker" class="btn btn-success">
                เพิ่ม / อัปเดต Marker
              </button>
              <button @click="resetForm" class="btn btn-secondary">
                ล้างฟอร์ม
              </button>
            </div>
          </div>

          <hr class="divider" />

          <!-- Marker List -->
          <div class="marker-list-container">
            <h3 class="marker-list-title">
              รายการ Marker ที่มีอยู่
              <span class="marker-list-count">({{ markerList.length }})</span>
            </h3>
            <ul class="marker-list">
              <li v-if="markerList.length === 0" class="empty-state">
                ยังไม่มี Marker กรุณาเพิ่มจากฟอร์ม
              </li>
              <li v-else v-for="(item) in markerList" :key="item.name">
                <button
                  @click="flyToMarker(item)"
                  class="marker-item"
                >
                  <span class="marker-name">{{ item.name }}</span>
                  <span class="marker-coords">
                    {{ item.lat.toFixed(4) }}, {{ item.lng.toFixed(4) }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </section>

        <!-- MAP SECTION -->
        <section class="map-section">
          <h2 class="form-title">
            <span class="title-badge">2</span>
            แผนที่ฐาน (Map base) – Leaflet + OpenStreetMap
          </h2>
          <p class="map-description">
            • Focus on Northern Thailand, zoom เริ่มต้นที่ 8<br />
            • Marker สีเขียว (Green icon) หลายจุด จากข้อมูลในฟอร์ม<br />
            • คลิก Marker เพื่อดูข้อมูลอาคาร (Pop-up) ที่อัปเดตตามข้อมูลล่าสุด
          </p>
          <div id="map" class="map-container"></div>
        </section>
      </div>

      <footer class="footer">
        Program by Vue.js | TailwindCSS | Leaflet.js | OpenStreetMap | Nominatim
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, markRaw } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// --- State ---
const placeName = ref('');
const lat = ref('');
const lng = ref('');
const address = ref('');
const isGeocoding = ref(false);

const map = ref(null);
const markersLayer = ref(null);
// We store markers locally to manage them
// key: name, value: { lat, lng, marker: LeafletMarker }
const markerMap = reactive({});

// Computed for list
const markerList = computed(() => {
  return Object.keys(markerMap).sort().map(name => ({
    name,
    lat: markerMap[name].lat,
    lng: markerMap[name].lng,
    marker: markerMap[name].marker
  }));
});

// --- Constants / Config ---
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const initialLocations = [
  { name: "อาคารที่ 1", lat: 18.758769, lng: 99.014645 },
  { name: "อาคาร 2", lat: 18.758914, lng: 99.015257 },
  { name: "อาคาร 3", lat: 18.758361, lng: 99.015129 },
  { name: "อาคาร 4", lat: 18.757983, lng: 99.015512 },
  { name: "อาคาร 5", lat: 18.758168, lng: 99.015763 },
  { name: "อาคาร 6", lat: 18.757394, lng: 99.015381 },
  { name: "อาคาร 7", lat: 18.75759, lng: 99.015905 },
  { name: "futsal", lat: 18.757955, lng: 99.015097 },
  { name: "สนามหญ้าจริง (safe zone)", lat: 18.757826, lng: 99.014679 },
  { name: "สนามบาสเก็ดบอล", lat: 18.757833, lng: 99.015761 },
];

const GEOCODE_CACHE_KEY = "longan_geocode_cache";

// --- Methods ---

function initMap() {
  map.value = L.map("map").setView([18.8, 99.0], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map.value);

  markersLayer.value = L.layerGroup().addTo(map.value);

  // Load initial Data
  initialLocations.forEach(loc => {
    addOrUpdateMarker(loc.name, loc.lat, loc.lng, false);
  });
}

function addOrUpdateMarker(name, latitude, longitude, flyTo = false) {
  if (!name || isNaN(latitude) || isNaN(longitude)) return;
  const key = name.trim();

  // Remove existing if any (logic from original code: update if exists)
  // In Vue/Leaflet, we can just update the LatLng or remove/add.
  // Original code updated properties.

  if (markerMap[key]) {
    // Update
    const m = markerMap[key].marker;
    m.setLatLng([latitude, longitude]);
    m.setPopupContent(createPopupContent(key, latitude, longitude));

    // Update reactive state
    markerMap[key].lat = latitude;
    markerMap[key].lng = longitude;
  } else {
    // Create New
    const marker = L.marker([latitude, longitude], { icon: greenIcon })
      .addTo(markersLayer.value);

    marker.bindPopup(createPopupContent(key, latitude, longitude));

    // Bind click
    marker.on("click", () => {
      marker.openPopup();
    });

    markerMap[key] = {
      lat: latitude,
      lng: longitude,
      marker: markRaw(marker)
    };
  }

  // Auto fit if adding/updating
  fitMapToAllMarkers();

  if (flyTo && map.value) {
    map.value.flyTo([latitude, longitude], 17, { duration: 0.8 });
    if(markerMap[key] && markerMap[key].marker) {
      setTimeout(() => {
        markerMap[key].marker.openPopup();
      }, 800);
    }
  }
}

function createPopupContent(name, lat, lng) {
  return `<div>
             <div class="font-semibold text-sm mb-1">${name}</div>
             <div class="text-[11px] text-slate-500">
               Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}
             </div>
           </div>`;
}

function fitMapToAllMarkers() {
  const list = Object.values(markerMap);
  if (list.length === 0 || !map.value) return;

  const group = L.featureGroup(list.map(m => m.marker));
  if (list.length === 1) {
    map.value.setView(group.getBounds().getCenter(), 17);
  } else {
    map.value.fitBounds(group.getBounds().pad(0.2));
  }
}

function handleAddMarker() {
  if (!placeName.value || lat.value === '' || lng.value === '') {
    alert("กรุณากรอกชื่อสถานที่ และ Latitude/Longitude ให้ครบถ้วน");
    return;
  }
  addOrUpdateMarker(placeName.value, Number(lat.value), Number(lng.value), true);
}

function resetForm() {
  placeName.value = '';
  lat.value = '';
  lng.value = '';
  address.value = '';
}

function flyToMarker(item) {
  if(!map.value) return;
  map.value.flyTo([item.lat, item.lng], 17, { duration: 0.7 });
  if(item.marker) {
    item.marker.openPopup();
  }
}

// --- Geocoding ---
async function handleGeocode() {
  const addr = address.value.trim();
  if (!addr) {
    alert("กรุณากรอกที่อยู่สำหรับ Geocoding");
    return;
  }

  isGeocoding.value = true;
  try {
    const result = await geocodeAddress(addr);
    if (!result) {
      alert("ไม่พบพิกัดจากที่อยู่นี้ (Nominatim)");
    } else {
      lat.value = Number(result.lat.toFixed(6));
      lng.value = Number(result.lng.toFixed(6));
      if(map.value) {
         map.value.flyTo([result.lat, result.lng], 15, { duration: 0.8 });
      }
    }
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดในการเรียก Geocoding");
  } finally {
    isGeocoding.value = false;
  }
}

async function geocodeAddress(addr) {
  let cache = {};
  try {
    const stored = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (stored) cache = JSON.parse(stored) || {};
  } catch (e) { cache = {}; }

  if (cache[addr]) {
    return cache[addr];
  }

  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(addr);
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) throw new Error("Geocoding error");

  const data = await res.json();
  if (!data || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);

  cache[addr] = { lat, lng };
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}

  return { lat, lng };
}

// --- Lifecycle ---
onMounted(() => {
  initMap();
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
  max-width: 1400px;
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
  margin: 0 0 24px 0;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
}

/* Main Grid Layout */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

/* Form Section */
.form-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.form-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 700;
  font-size: 0.85rem;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.form-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.form-hint {
  font-size: 0.8rem;
  color: #9ca3af;
  margin: 0;
}

/* Buttons */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
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
  flex: 1;
  min-width: 120px;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background: #10b981;
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-success:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
  background: #059669;
}

.btn-success:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
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

/* Divider */
.divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 16px 0;
}

/* Marker List */
.marker-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.marker-list-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.marker-list-count {
  font-size: 0.85rem;
  color: #9ca3af;
  font-weight: 400;
}

.marker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

.marker-list li {
  width: 100%;
}

.empty-state {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

.marker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  font-family: inherit;
  font-size: 0.85rem;
}

.marker-item:hover {
  background: #eff6ff;
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.marker-name {
  font-weight: 600;
  color: #1a202c;
  flex: 1;
}

.marker-coords {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: 8px;
  white-space: nowrap;
}

/* Map Section */
.map-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-description {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.map-container {
  height: 550px;
  border-radius: 12px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

/* Footer */
.footer {
  text-align: center;
  font-size: 0.8rem;
  color: #9ca3af;
  padding: 16px 0;
}

/* Leaflet popup overrides */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.leaflet-popup-tip) {
  background: #ffffff;
}
</style>
