<template>
  <q-page :class="pagePadClass + ' bg-grey-2'">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">
          กำหนดสถานที่ปลอดภัย
        </h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">
          โรงเรียนวารีเชียงใหม่ (Northern Thailand)
        </p>

        <div class="column q-gutter-lg">
          <!-- MAP (อยู่บนสุดเสมอ) -->
          <q-card class="my-card map-card">
            <q-card-section class="q-pb-none">
              <div class="text-h6 text-primary flex items-center">
                <q-badge color="primary" class="q-mr-sm text-subtitle2">1</q-badge>
                แผนที่ (LeafletJS + OSM)
              </div>
              <p class="text-caption text-grey-7 q-ma-none">
                คลิกที่ Marker เพื่อดูรายละเอียด (Popup)
              </p>
            </q-card-section>

            <q-separator />

            <q-card-section class="map-body relative-position">
              <!-- ✅ เฝ้าดูขนาด container จริง -->
              <q-resize-observer @resize="onMapContainerResize" />

              <div ref="mapEl" class="map-container rounded-borders shadow-1" :style="{ height: mapHeight }"></div>

              <q-inner-loading :showing="isLoadingMarkers">
                <q-spinner-gears size="50px" color="primary" />
                <div class="text-subtitle2 q-mt-sm">กำลังโหลดข้อมูลสถานที่...</div>
              </q-inner-loading>
            </q-card-section>
          </q-card>

          <!-- FORM + TABLE -->
          <q-card class="my-card">
            <q-card-section>
              <div class="text-h6 text-primary flex items-center q-mb-md">
                <q-badge color="primary" class="q-mr-sm text-subtitle2">2</q-badge>
                ฟอร์มบันทึกตำแหน่ง (Marker Form)
              </div>

              <div class="q-gutter-y-md">
                <q-input v-model="placeName" label="ชื่อสถานที่ / อาคาร" placeholder="เช่น อาคารที่ 1" outlined
                  :dense="isMobile" bg-color="white"
                  :rules="[val => !!String(val || '').trim() || 'กรุณากรอกชื่อสถานที่']">
                  <template #prepend><q-icon name="place" /></template>
                </q-input>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-6">
                    <q-input v-model.number="lat" type="number" label="Latitude" placeholder="18.xxxx" outlined
                      :dense="isMobile" bg-color="white" step="0.000001" />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input v-model.number="lng" type="number" label="Longitude" placeholder="99.xxxx" outlined
                      :dense="isMobile" bg-color="white" step="0.000001" />
                  </div>
                </div>

                <q-input v-model="address" label="ค้นหาจากชื่อที่อยู่ (Geocoding)" placeholder="เช่น โรงเรียนวารี"
                  outlined :dense="isMobile" bg-color="white" @keyup.enter="handleGeocode"
                  hint="ใช้บริการ Nominatim (OpenStreetMap)">
                  <template #append>
                    <q-btn flat round color="primary" icon="search" @click="handleGeocode" :loading="isGeocoding" />
                  </template>
                </q-input>

                <div class="row items-center q-px-sm border-grey-1 rounded-borders bg-white q-py-xs">
                  <q-checkbox v-model="isSafeZone" label="สถานะ Safe Zone (จุดปลอดภัย)" color="positive" keep-color
                    :dense="isMobile" />
                  <q-icon name="emergency" :color="isSafeZone ? 'red' : 'grey-4'" size="22px" class="q-ml-sm" />
                </div>

                <!-- ✅ ปุ่มปรับตามอุปกรณ์: มือถือเต็มกว้าง, จอใหญ่เรียงกัน -->
                <div class="row q-col-gutter-sm q-mt-md">
                  <div class="col-12 col-sm-auto">
                    <q-btn unelevated color="secondary" text-color="white" icon="my_location" label="ค้นหาพิกัด"
                      @click="handleGeocode" :loading="isGeocoding" :class="isMobile ? 'full-width' : ''" />
                  </div>
                  <div class="col-12 col-sm-auto">
                    <q-btn unelevated color="positive" icon="add_location_alt" label="เพิ่ม/อัปเดต"
                      @click="handleAddMarker" :class="isMobile ? 'full-width' : ''" />
                  </div>
                  <div class="col-12 col-sm-auto">
                    <q-btn outline color="grey-7" label="ล้างค่า" @click="resetForm"
                      :class="isMobile ? 'full-width' : ''" />
                  </div>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <div class="row items-center q-mb-sm">
                <div class="text-subtitle2 text-grey-8">
                  รายการ Marker ({{ markerList.length }})
                </div>
                <q-space />
                <q-btn flat round color="primary" icon="refresh" size="sm" @click="reloadMarkers"
                  :loading="isLoadingMarkers">
                  <q-tooltip>รีเฟรชข้อมูล</q-tooltip>
                </q-btn>
              </div>

              <!-- ✅ ตาราง responsive:
                   - Mobile: grid card (อ่านง่าย)
                   - Desktop: table ปกติ -->
              <q-table :rows="markerList" :columns="markerTableColumns" :visible-columns="visibleColumns" row-key="name"
                flat bordered :dense="isMobile" :grid="isMobile" :hide-header="isMobile"
                :pagination="{ rowsPerPage: isMobile ? 6 : 10 }" class="bg-white">
                <!-- Desktop: safe chip -->
                <template v-if="!isMobile" #body-cell-isSafeZone="props">
                  <q-td :props="props" class="text-center">
                    <q-chip v-if="props.value" color="negative" text-color="white" size="sm" dense icon="emergency"
                      label="Safe" />
                    <q-chip v-else color="grey-3" text-color="grey-8" size="sm" dense label="-" />
                  </q-td>
                </template>

                <template v-if="!isMobile" #body-cell-actions="props">
                  <q-td :props="props" class="text-right">
                    <div class="row q-gutter-xs justify-end no-wrap">
                      <q-btn flat round color="primary" icon="my_location" size="sm"
                        @click.stop="flyToMarker(props.row)">
                        <q-tooltip>ไปที่ตำแหน่งนี้</q-tooltip>
                      </q-btn>
                      <q-btn flat round color="orange" icon="edit" size="sm" @click.stop="confirmEdit(props.row.name)">
                        <q-tooltip>แก้ไขชื่อ/สถานะ</q-tooltip>
                      </q-btn>
                      <q-btn flat round color="negative" icon="delete" size="sm"
                        @click.stop="confirmDelete(props.row.name)">
                        <q-tooltip>ลบ</q-tooltip>
                      </q-btn>
                    </div>
                  </q-td>
                </template>

                <!-- Mobile: card -->
                <template v-if="isMobile" #item="props">
                  <div class="col-12">
                    <q-card class="q-mb-sm">
                      <q-card-section class="q-pb-sm">
                        <div class="row items-start">
                          <div class="col">
                            <div class="text-subtitle1 text-weight-bold">
                              {{ props.row.name }}
                            </div>
                            <div class="text-caption text-grey-7 q-mt-xs">
                              Lat: {{ fmt5(props.row.lat) }} | Lng: {{ fmt5(props.row.lng) }}
                            </div>
                          </div>

                          <div class="col-auto">
                            <q-chip v-if="props.row.isSafeZone" color="negative" text-color="white" dense
                              icon="emergency" label="Safe" />
                            <q-chip v-else color="grey-3" text-color="grey-8" dense label="-" />
                          </div>
                        </div>
                      </q-card-section>

                      <q-separator />

                      <q-card-actions align="right" class="q-pa-sm">
                        <q-btn flat color="primary" icon="my_location" label="ไปที่นี่"
                          @click="flyToMarker(props.row)" />
                        <q-btn flat color="orange" icon="edit" label="แก้ไข" @click="confirmEdit(props.row.name)" />
                        <q-btn flat color="negative" icon="delete" label="ลบ" @click="confirmDelete(props.row.name)" />
                      </q-card-actions>
                    </q-card>
                  </div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>

        <!-- Rename Dialog -->
        <q-dialog v-model="editDialogOpen" persistent>
          <q-card :style="dialogStyle">
            <q-card-section class="bg-primary text-white q-pa-md">
              <div class="text-h6 text-weight-bold">แก้ไขชื่อสถานที่</div>
            </q-card-section>

            <q-card-section class="q-pt-lg q-gutter-y-md">
              <q-input v-model="newPlaceName" label="ชื่อสถานที่ใหม่" outlined :dense="isMobile" autofocus
                @keyup.enter="handleRename" :rules="[val => !!String(val || '').trim() || 'กรุณากรอกชื่อสถานที่']" />
              <q-checkbox v-model="isEditSafeZone" label="สถานะ Safe Zone (จุดปลอดภัย)" color="negative"
                :dense="isMobile" />
            </q-card-section>

            <q-card-actions align="right" class="text-primary q-pb-md q-px-md">
              <q-btn flat label="ยกเลิก" color="grey-7" v-close-popup />
              <q-btn unelevated label="บันทึกการแก้ไข" color="primary" @click="handleRename" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <div class="text-center q-mt-lg text-caption text-grey">
          Program by Vue.js & Quasar Framework | Leaflet.js | OpenStreetMap
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, reactive, markRaw, nextTick, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import { SHARED_LOCATIONS } from '../constants/locations';

const $q = useQuasar();

// -----------------------------
// State
// -----------------------------
const placeName = ref('');
const lat = ref(null);
const lng = ref(null);
const isSafeZone = ref(false);

const address = ref('');
const isGeocoding = ref(false);
const isLoadingMarkers = ref(false);

const editDialogOpen = ref(false);
const oldPlaceName = ref('');
const newPlaceName = ref('');
const isEditSafeZone = ref(false);

// Leaflet refs
const mapEl = ref(null);
const map = ref(null);
const markersLayer = ref(null);

// { [name]: { lat, lng, isSafeZone, marker } }
const markerMap = reactive({});

// -----------------------------
// Config
// -----------------------------
const initialLocations = SHARED_LOCATIONS;
const GEOCODE_CACHE_KEY = 'longan_geocode_cache';
const DEFAULT_VIEW = { center: [18.8, 99.0], zoom: 8 };

// -----------------------------
// Responsive (scale ตามอุปกรณ์)
// -----------------------------
const isMobile = computed(() => $q.screen.lt.md);
const pagePadClass = computed(() => (isMobile.value ? 'q-pa-sm' : 'q-pa-md'));

const mapHeight = computed(() => {
  // ให้สูงพอดีจอมือถือ/แท็บเล็ต และไม่ใหญ่เกินบนเดสก์ท็อป
  if ($q.screen.xs) return '42vh';
  if ($q.screen.sm) return '48vh';
  if ($q.screen.md) return '520px';
  return '640px';
});

const dialogStyle = computed(() => {
  return isMobile.value
    ? 'width: 95vw; max-width: 95vw; border-radius: 12px; overflow: hidden;'
    : 'min-width: 420px; max-width: 520px; border-radius: 12px; overflow: hidden;';
});

const visibleColumns = computed(() => {
  // ใช้ grid card บนมือถืออยู่แล้ว (hide-header=true)
  return isMobile.value ? ['name', 'isSafeZone', 'actions'] : ['name', 'lat', 'lng', 'isSafeZone', 'actions'];
});

// -----------------------------
// Helpers
// -----------------------------
function normalizeName(name) {
  return String(name || '').trim();
}
function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function toBool(v) {
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 'yes' || s === 'y') return true;
    if (s === 'false' || s === 'no' || s === 'n') return false;
  }
  return !!v;
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function fmt5(val) {
  const n = safeNumber(val);
  return Number.isFinite(n) ? n.toFixed(5) : '-';
}
function debounce(fn, wait = 150) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// -----------------------------
// Computed
// -----------------------------
const markerList = computed(() => {
  return Object.keys(markerMap)
    .sort()
    .map((name) => ({
      name,
      lat: markerMap[name].lat,
      lng: markerMap[name].lng,
      isSafeZone: !!markerMap[name].isSafeZone,
      marker: markerMap[name].marker
    }));
});

const markerTableColumns = [
  { name: 'name', label: 'ชื่อสถานที่', field: 'name', align: 'left', sortable: true },
  { name: 'lat', label: 'Latitude', field: 'lat', align: 'left', format: fmt5 },
  { name: 'lng', label: 'Longitude', field: 'lng', align: 'left', format: fmt5 },
  { name: 'isSafeZone', label: 'สถานะ Safe Zone', field: 'isSafeZone', align: 'center', sortable: true },
  { name: 'actions', label: 'จัดการ', align: 'right' }
];

// -----------------------------
// Icons
// -----------------------------
const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// -----------------------------
// Focus memory
// -----------------------------
const lastFocus = ref({ type: 'bounds', payload: null });

function getResponsiveZoom() {
  if ($q.screen.xs) return 16;
  if ($q.screen.sm) return 16;
  return 17;
}
function getResponsivePadding() {
  if ($q.screen.xs) return 24;
  if ($q.screen.sm) return 34;
  if ($q.screen.md) return 46;
  return 60;
}
function getResponsivePanOffsetY() {
  if ($q.screen.xs) return 120;
  if ($q.screen.sm) return 95;
  return 75;
}

function focusLatLng(latlng, zoom = getResponsiveZoom(), openPopupMarker = null, opts = { animate: true }) {
  if (!map.value) return;
  const ll = Array.isArray(latlng) ? L.latLng(latlng[0], latlng[1]) : latlng;

  if (opts.animate) {
    map.value.flyTo(ll, zoom, { duration: 0.7 });
    setTimeout(() => {
      if (!map.value) return;
      if (openPopupMarker) openPopupMarker.openPopup();
      map.value.panBy([0, -getResponsivePanOffsetY()], { animate: true });
    }, 750);
  } else {
    map.value.setView(ll, zoom, { animate: false });
    if (openPopupMarker) openPopupMarker.openPopup();
    map.value.panBy([0, -getResponsivePanOffsetY()], { animate: false });
  }

  lastFocus.value = { type: 'point', payload: { latlng: ll } };
}

function focusBounds(bounds, opts = { animate: true }) {
  if (!map.value) return;
  const pad = getResponsivePadding();
  map.value.fitBounds(bounds, {
    paddingTopLeft: [pad, pad],
    paddingBottomRight: [pad, pad],
    animate: !!opts.animate
  });
  lastFocus.value = { type: 'bounds', payload: { bounds } };
}

function refocusLast() {
  if (!map.value || !lastFocus.value?.payload) return;

  if (lastFocus.value.type === 'point') {
    focusLatLng(lastFocus.value.payload.latlng, getResponsiveZoom(), null, { animate: false });
  } else if (lastFocus.value.type === 'bounds' && lastFocus.value.payload?.bounds) {
    focusBounds(lastFocus.value.payload.bounds, { animate: false });
  }
}

// -----------------------------
// Map sizing utilities
// -----------------------------
function invalidateLeafletSize() {
  if (!map.value) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        map.value?.invalidateSize({ animate: false });
      } catch { }
    });
  });
}

const onMapContainerResize = debounce(({ width, height }) => {
  if (!map.value) return;
  if (!width || !height) return;

  invalidateLeafletSize();
  setTimeout(() => refocusLast(), 60);
}, 120);

// -----------------------------
// Map lifecycle
// -----------------------------
function destroyMap() {
  if (!map.value) return;
  try {
    map.value.off();
    map.value.remove();
  } catch { }
  map.value = null;
  markersLayer.value = null;
}

function clearAllMarkers() {
  try {
    markersLayer.value?.clearLayers();
  } catch { }
  for (const key of Object.keys(markerMap)) delete markerMap[key];
}

// -----------------------------
// API
// -----------------------------
async function fetchMarkersFromBackend() {
  const response = await api.get('/api/markers');
  return Array.isArray(response.data) ? response.data : [];
}

async function loadMarkers() {
  isLoadingMarkers.value = true;
  try {
    const markers = await fetchMarkersFromBackend();
    if (!map.value) return;

    clearAllMarkers();

    if (markers.length > 0) {
      markers.forEach((loc) => {
        const name = normalizeName(loc.name);
        const latitude = safeNumber(loc.lat);
        const longitude = safeNumber(loc.lng);
        const safe = toBool(loc.isSafeZone);

        addOrUpdateMarker(name, latitude, longitude, safe, false, false);
      });
    } else {
      initialLocations.forEach((loc) => addOrUpdateMarker(loc.name, loc.lat, loc.lng, false, false, false));
    }
  } catch (error) {
    console.error('Failed to fetch markers:', error);

    clearAllMarkers();
    initialLocations.forEach((loc) => addOrUpdateMarker(loc.name, loc.lat, loc.lng, false, false, false));

    $q.notify({ color: 'warning', message: 'โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ ใช้ค่าเริ่มต้นแทน', icon: 'warning' });
  } finally {
    isLoadingMarkers.value = false;
    setTimeout(() => {
      invalidateLeafletSize();
      fitMapToAllMarkers();
    }, 80);
  }
}

async function initMap() {
  if (map.value) destroyMap();

  map.value = markRaw(L.map(mapEl.value).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom));

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map.value);

  markersLayer.value = markRaw(L.layerGroup()).addTo(map.value);

  map.value.on('click', (e) => {
    lat.value = Number(e.latlng.lat.toFixed(6));
    lng.value = Number(e.latlng.lng.toFixed(6));
    $q.notify({
      color: 'info',
      message: `เลือกพิกัด: ${lat.value}, ${lng.value}`,
      icon: 'add_location',
      timeout: 1500,
      position: 'bottom-right'
    });
  });

  invalidateLeafletSize();
  await loadMarkers();
}

async function reloadMarkers() {
  if (!map.value) return initMap();
  await loadMarkers();
  invalidateLeafletSize();
}

// -----------------------------
// Marker logic
// -----------------------------
function addOrUpdateMarker(name, latitude, longitude, isSafeZoneVal = false, flyTo = false, doFit = true) {
  const key = normalizeName(name);
  const latN = safeNumber(latitude);
  const lngN = safeNumber(longitude);

  if (!key || !Number.isFinite(latN) || !Number.isFinite(lngN) || !markersLayer.value) return;

  const safe = toBool(isSafeZoneVal);
  const targetIcon = safe ? redIcon : greenIcon;

  if (markerMap[key]) {
    const m = markerMap[key].marker;
    m.setLatLng([latN, lngN]);
    m.setIcon(targetIcon);
    m.setPopupContent(createPopupContent(key, latN, lngN, safe));
    markerMap[key].lat = latN;
    markerMap[key].lng = lngN;
    markerMap[key].isSafeZone = safe;
  } else {
    const marker = L.marker([latN, lngN], { icon: targetIcon }).addTo(markersLayer.value);

    marker.bindPopup(createPopupContent(key, latN, lngN, safe));

    marker.on('popupopen', (evt) => {
      const container = evt.popup.getElement();
      if (!container) return;

      const editBtn = container.querySelector('[data-action="edit"]');
      const delBtn = container.querySelector('[data-action="delete"]');

      if (editBtn) editBtn.onclick = () => confirmEdit(key);
      if (delBtn) delBtn.onclick = () => confirmDelete(key);
    });

    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    marker.on('click', () => {
      marker.openPopup();
      flyToMarker({ lat: latN, lng: lngN, marker });
    });

    markerMap[key] = { lat: latN, lng: lngN, isSafeZone: safe, marker: markRaw(marker) };
  }

  if (doFit) fitMapToAllMarkers();
  if (flyTo && map.value) focusLatLng([latN, lngN], getResponsiveZoom(), markerMap[key]?.marker, { animate: true });
}

function createPopupContent(name, latV, lngV, isSafeZoneVal) {
  const safeName = escapeHtml(name);
  return `
    <div class="custom-popup">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">
        ${safeName}
        ${isSafeZoneVal ? '<span style="color:red;margin-left:5px;">(Safe Zone)</span>' : ''}
      </div>
      <div style="font-size:12px;color:#666;margin-bottom:8px;">
        Lat: ${Number(latV).toFixed(6)}<br/>Lng: ${Number(lngV).toFixed(6)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button data-action="edit"
          class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle text-primary q-focusable q-hoverable q-btn--dense"
          style="font-size:11px;padding:4px 8px;min-height:unset;">
          <span class="q-btn__content text-center col items-center q-anchor--skip justify-center row">
            <i class="q-icon material-icons" aria-hidden="true" role="img">edit</i>
            <span class="block q-ml-xs">แก้ไข</span>
          </span>
        </button>

        <button data-action="delete"
          class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle text-negative q-focusable q-hoverable q-btn--dense"
          style="font-size:11px;padding:4px 8px;min-height:unset;">
          <span class="q-btn__content text-center col items-center q-anchor--skip justify-center row">
            <i class="q-icon material-icons" aria-hidden="true" role="img">delete</i>
            <span class="block q-ml-xs">ลบ</span>
          </span>
        </button>
      </div>
    </div>
  `;
}

function fitMapToAllMarkers() {
  if (!map.value) return;
  const list = Object.values(markerMap);

  if (list.length === 0) {
    map.value.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { animate: false });
    lastFocus.value = { type: 'bounds', payload: null };
    return;
  }

  const group = L.featureGroup(list.map((m) => m.marker));
  const bounds = group.getBounds();

  if (list.length === 1) {
    const only = list[0];
    focusLatLng([only.lat, only.lng], getResponsiveZoom(), only.marker, { animate: true });
  } else {
    focusBounds(bounds, { animate: true });
  }
}

// -----------------------------
// CRUD Handlers
// -----------------------------
async function handleAddMarker() {
  const name = normalizeName(placeName.value);
  const latN = safeNumber(lat.value);
  const lngN = safeNumber(lng.value);

  if (!name || !Number.isFinite(latN) || !Number.isFinite(lngN)) {
    $q.notify({ color: 'negative', message: 'กรุณากรอกชื่อสถานที่ และ Latitude/Longitude ให้ครบถ้วน', icon: 'warning' });
    return;
  }

  const markerData = { name, lat: latN, lng: lngN, isSafeZone: !!isSafeZone.value };

  try {
    await api.post('/api/markers', markerData);
    addOrUpdateMarker(markerData.name, markerData.lat, markerData.lng, markerData.isSafeZone, true, true);
    $q.notify({ color: 'positive', message: `บันทึก "${name}" เรียบร้อยแล้ว`, icon: 'check_circle' });
  } catch (error) {
    console.error('Error saving marker:', error);
    $q.notify({ color: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', icon: 'error' });
  } finally {
    invalidateLeafletSize();
  }
}

function confirmEdit(name) {
  const key = normalizeName(name);
  if (!key || !markerMap[key]) return;

  oldPlaceName.value = key;
  newPlaceName.value = key;
  isEditSafeZone.value = !!markerMap[key]?.isSafeZone;
  editDialogOpen.value = true;
}

async function handleRename() {
  const oldName = normalizeName(oldPlaceName.value);
  const newNameVal = normalizeName(newPlaceName.value);
  const safe = !!isEditSafeZone.value;

  if (!newNameVal) {
    $q.notify({ color: 'warning', message: 'กรุณากรอกชื่อสถานที่' });
    return;
  }

  const oldData = markerMap[oldName];
  if (!oldData) {
    editDialogOpen.value = false;
    return;
  }

  if (oldName === newNameVal && !!oldData.isSafeZone === safe) {
    editDialogOpen.value = false;
    return;
  }

  $q.loading.show({ message: 'กำลังบันทึกการแก้ไข...' });

  try {
    const markerData = { name: newNameVal, lat: oldData.lat, lng: oldData.lng, isSafeZone: safe };

    await api.post('/api/markers', markerData);

    if (oldName !== newNameVal) {
      await api.delete(`/api/markers/${encodeURIComponent(oldName)}`);
      markersLayer.value?.removeLayer(oldData.marker);
      delete markerMap[oldName];
    }

    addOrUpdateMarker(markerData.name, markerData.lat, markerData.lng, markerData.isSafeZone, false, true);

    $q.notify({ color: 'positive', message: 'บันทึกการแก้ไขเรียบร้อยแล้ว', icon: 'check_circle' });
    editDialogOpen.value = false;
  } catch (error) {
    console.error('Update failed:', error);
    $q.notify({ color: 'negative', message: 'บันทึกไม่สำเร็จ', icon: 'error' });
  } finally {
    $q.loading.hide();
    invalidateLeafletSize();
  }
}

function confirmDelete(name) {
  const key = normalizeName(name);
  if (!key) return;

  $q.dialog({
    title: 'ยืนยันการลบ',
    message: `คุณต้องการลบตำแหน่ง "${key}" ใช่หรือไม่?`,
    cancel: true,
    persistent: true,
    ok: { flat: true, color: 'negative', label: 'ลบออก' }
  }).onOk(async () => {
    await handleDeleteMarker(key);
  });
}

async function handleDeleteMarker(name) {
  const key = normalizeName(name);
  try {
    await api.delete(`/api/markers/${encodeURIComponent(key)}`);

    if (markerMap[key]) {
      markersLayer.value?.removeLayer(markerMap[key].marker);
      delete markerMap[key];
    }

    fitMapToAllMarkers();
    $q.notify({ color: 'positive', message: `ลบ "${key}" เรียบร้อยแล้ว`, icon: 'delete' });
  } catch (error) {
    console.error('Error deleting marker:', error);
    $q.notify({ color: 'negative', message: 'เกิดข้อผิดพลาดในการลบข้อมูล', icon: 'error' });
  } finally {
    invalidateLeafletSize();
  }
}

// -----------------------------
// UI
// -----------------------------
function resetForm() {
  placeName.value = '';
  lat.value = null;
  lng.value = null;
  isSafeZone.value = false;
  address.value = '';
}

function flyToMarker(item) {
  focusLatLng([item.lat, item.lng], getResponsiveZoom(), item.marker, { animate: true });
}

// -----------------------------
// Geocoding
// -----------------------------
async function handleGeocode() {
  const addr = normalizeName(address.value);
  if (!addr) {
    $q.notify({ color: 'warning', message: 'กรุณากรอกที่อยู่สำหรับค้นหา', icon: 'search' });
    return;
  }

  isGeocoding.value = true;
  try {
    const result = await geocodeAddress(addr);
    if (!result) {
      $q.notify({ color: 'negative', message: 'ไม่พบพิกัดจากที่อยู่นี้', icon: 'error' });
    } else {
      lat.value = Number(result.lat.toFixed(6));
      lng.value = Number(result.lng.toFixed(6));

      const z = $q.screen.xs ? 15 : 16;
      focusLatLng([result.lat, result.lng], z, null, { animate: true });

      $q.notify({ color: 'positive', message: 'พบตำแหน่งแล้ว', icon: 'check' });
    }
  } catch (err) {
    console.error(err);
    $q.notify({ color: 'negative', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', icon: 'error' });
  } finally {
    isGeocoding.value = false;
    invalidateLeafletSize();
  }
}

async function geocodeAddress(addr) {
  let cache = {};
  try {
    const stored = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (stored) cache = JSON.parse(stored) || {};
  } catch {
    cache = {};
  }

  if (cache[addr]) return cache[addr];

  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(addr);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Geocoding error');

  const data = await res.json();
  if (!data || data.length === 0) return null;

  const latV = parseFloat(data[0].lat);
  const lngV = parseFloat(data[0].lon);

  cache[addr] = { lat: latV, lng: lngV };
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch { }

  return { lat: latV, lng: lngV };
}

// -----------------------------
// Lifecycle
// -----------------------------
onMounted(async () => {
  await nextTick();
  await initMap();
  setTimeout(() => invalidateLeafletSize(), 200);
});

onBeforeUnmount(() => {
  destroyMap();
});
</script>

<style scoped>
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.leaflet-popup-tip) {
  background: #ffffff;
}

.map-card {
  display: flex;
  flex-direction: column;
}

.map-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.map-container {
  width: 100%;
  flex: 1;
  min-height: 320px;
  z-index: 1;
}
</style>
