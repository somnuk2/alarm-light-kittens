<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-xl-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">กำหนดสถานที่ปลอดภัย</h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">โรงเรียนวารีเชียงใหม่ (Northern Thailand)</p>

        <div class="row q-col-gutter-lg">
          <!-- Left Column: FORM -->
          <div class="col-12 col-md-4">
            <q-card class="my-card q-mb-md">
              <q-card-section>
                <div class="text-h6 text-primary flex items-center q-mb-md">
                  <q-badge color="primary" class="q-mr-sm text-subtitle2">1</q-badge>
                  ฟอร์มบันทึกตำแหน่ง (Marker Form)
                </div>

                <div class="q-gutter-y-md">
                  <!-- Place Name -->
                  <q-input
                    v-model="placeName"
                    label="ชื่อสถานที่ / อาคาร"
                    placeholder="เช่น อาคารที่ 1"
                    outlined
                    dense
                    bg-color="white"
                    :rules="[val => !!val || 'กรุณากรอกชื่อสถานที่']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="place" />
                    </template>
                  </q-input>

                  <!-- Lat/Lng Grid -->
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <q-input
                        v-model.number="lat"
                        type="number"
                        label="Latitude"
                        placeholder="18.xxxx"
                        outlined
                        dense
                        bg-color="white"
                        step="0.000001"
                      />
                    </div>
                    <div class="col-6">
                      <q-input
                        v-model.number="lng"
                        type="number"
                        label="Longitude"
                        placeholder="99.xxxx"
                        outlined
                        dense
                        bg-color="white"
                        step="0.000001"
                      />
                    </div>
                  </div>

                  <!-- Geocoding -->
                  <q-input
                    v-model="address"
                    label="ค้นหาจากชื่อที่อยู่ (Geocoding)"
                    placeholder="เช่น โรงเรียนวารี"
                    outlined
                    dense
                    bg-color="white"
                    @keyup.enter="handleGeocode"
                    hint="ใช้บริการ Nominatim (OpenStreetMap)"
                  >
                    <template v-slot:append>
                      <q-btn flat round color="primary" icon="search" @click="handleGeocode" :loading="isGeocoding" />
                    </template>
                  </q-input>

                  <!-- Buttons -->
                  <div class="row q-gutter-sm justify-center q-mt-md">
                    <q-btn
                      unelevated
                      color="secondary"
                      text-color="white"
                      icon="my_location"
                      label="ค้นหาพิกัด"
                      @click="handleGeocode"
                      :loading="isGeocoding"
                      class="col-auto"
                    />
                    <q-btn
                      unelevated
                      color="positive"
                      icon="add_location_alt"
                      label="เพิ่ม/อัปเดต"
                      @click="handleAddMarker"
                      class="col-auto"
                    />
                    <q-btn
                      outline
                      color="grey-7"
                      label="ล้างค่า"
                      @click="resetForm"
                      class="col-auto"
                    />
                  </div>
                </div>
              </q-card-section>

              <q-separator />

              <!-- Marker List -->
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm text-grey-8">
                  รายการ Marker ({{ markerList.length }})
                </div>

                <q-scroll-area style="height: 250px;">
                  <q-list separator bordered class="rounded-borders bg-white">
                    <q-item v-if="markerList.length === 0">
                      <q-item-section class="text-center text-grey text-italic">
                        ยังไม่มีข้อมูล
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-for="item in markerList"
                      :key="item.name"
                      clickable
                      v-ripple
                      @click="flyToMarker(item)"
                    >
                      <q-item-section avatar>
                        <q-icon name="push_pin" color="green-6" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{ item.name }}</q-item-label>
                        <q-item-label caption>
                          {{ item.lat.toFixed(5) }}, {{ item.lng.toFixed(5) }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon name="chevron_right" color="grey-4" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-scroll-area>
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column: MAP -->
          <div class="col-12 col-md-8">
            <q-card class="my-card fit">
              <q-card-section class="q-pb-none">
                 <div class="text-h6 text-primary flex items-center">
                  <q-badge color="primary" class="q-mr-sm text-subtitle2">2</q-badge>
                  แผนที่ (LeafletJS + OSM)
                </div>
                <p class="text-caption text-grey-7 q-ma-none">
                  คลิกที่ Marker เพื่อดูรายละเอียด (Popup)
                </p>
              </q-card-section>
              <q-card-section>
                <div id="map" class="rounded-borders shadow-1" style="height: 600px; width: 100%; z-index: 1;"></div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="text-center q-mt-lg text-caption text-grey">
          Program by Vue.js & Quasar Framework | Leaflet.js | OpenStreetMap
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, reactive, markRaw } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// --- State ---
const placeName = ref('');
const lat = ref('');
const lng = ref('');
const address = ref('');
const isGeocoding = ref(false);

const map = ref(null);
const markersLayer = ref(null);
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
  { name: "อาคารที่ 2", lat: 18.758914, lng: 99.015257 },
  { name: "อาคารที่ 3", lat: 18.758361, lng: 99.015129 },
  { name: "อาคารที่ 4", lat: 18.757983, lng: 99.015512 },
  { name: "อาคารที่ 5", lat: 18.758168, lng: 99.015763 },
  { name: "อาคารที่ 6", lat: 18.757394, lng: 99.015381 },
  { name: "อาคารที่ 7", lat: 18.75759, lng: 99.015905 },
  { name: "สนามฟุตซอล", lat: 18.757955, lng: 99.015097 },
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

  if (markerMap[key]) {
    // Update
    const m = markerMap[key].marker;
    m.setLatLng([latitude, longitude]);
    m.setPopupContent(createPopupContent(key, latitude, longitude));

    markerMap[key].lat = latitude;
    markerMap[key].lng = longitude;
  } else {
    // Create New
    const marker = L.marker([latitude, longitude], { icon: greenIcon })
      .addTo(markersLayer.value);

    marker.bindPopup(createPopupContent(key, latitude, longitude));

    marker.on("click", () => {
      marker.openPopup();
    });

    markerMap[key] = {
      lat: latitude,
      lng: longitude,
      marker: markRaw(marker)
    };
  }

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
             <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${name}</div>
             <div style="font-size: 12px; color: #666;">
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
    $q.notify({
      color: 'negative',
      message: 'กรุณากรอกชื่อสถานที่ และ Latitude/Longitude ให้ครบถ้วน',
      icon: 'warning'
    });
    return;
  }
  addOrUpdateMarker(placeName.value, Number(lat.value), Number(lng.value), true);
  $q.notify({
      color: 'positive',
      message: `บันทึก "${placeName.value}" เรียบร้อยแล้ว`,
      icon: 'check_circle'
    });
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
    $q.notify({
      color: 'warning',
      message: 'กรุณากรอกที่อยู่สำหรับค้นหา',
      icon: 'search'
    });
    return;
  }

  isGeocoding.value = true;
  try {
    const result = await geocodeAddress(addr);
    if (!result) {
       $q.notify({
        color: 'negative',
        message: 'ไม่พบพิกัดจากที่อยู่นี้',
        icon: 'error'
      });
    } else {
      lat.value = Number(result.lat.toFixed(6));
      lng.value = Number(result.lng.toFixed(6));
      if(map.value) {
         map.value.flyTo([result.lat, result.lng], 15, { duration: 0.8 });
      }
       $q.notify({
        color: 'positive',
        message: 'พบตำแหน่งแล้ว',
        icon: 'check'
      });
    }
  } catch (err) {
    console.error(err);
     $q.notify({
        color: 'negative',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        icon: 'error'
      });
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
/* Leaflet popup overrides */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.leaflet-popup-tip) {
  background: #ffffff;
}
</style>
