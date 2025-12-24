<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-lg-10">
        <h1 class="text-h4 text-center text-weight-bold q-mb-xs text-primary">แผนที่ระบุตำแหน่งอาคาร</h1>
        <p class="text-subtitle1 text-center text-grey-7 q-mb-lg">โรงเรียนวารีเชียงใหม่ (Northern Thailand)</p>

        <!-- Controls Section -->
        <q-card class="my-card q-mb-md">
          <q-card-section class="bg-blue-grey-1">
            <div class="row q-col-gutter-md items-end">
              <!-- Place Name -->
              <div class="col-12 col-md-3">
                <q-input
                  v-model="placeName"
                  label="ชื่อสถานที่ / อาคาร"
                  placeholder="เช่น อาคารที่ 1"
                  outlined
                  dense
                  bg-color="white"
                />
              </div>

              <!-- Lat -->
              <div class="col-6 col-md-2">
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

              <!-- Lng -->
              <div class="col-6 col-md-2">
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

               <!-- Address -->
              <div class="col-12 col-md-3">
                <q-input
                  v-model="address"
                  label="ค้นหาพิกัด (Geocoding)"
                  placeholder="เช่น โรงเรียนวารี"
                  outlined
                  dense
                  bg-color="white"
                  @keyup.enter="handleGeocode"
                />
              </div>

              <!-- Button Group -->
              <div class="col-12 col-md-auto row q-gutter-sm">
                <q-btn
                  unelevated
                  color="secondary"
                  icon="search"
                  @click="handleGeocode"
                  :loading="isGeocoding"
                  round
                  dense
                >
                  <q-tooltip>ค้นหาพิกัด</q-tooltip>
                </q-btn>

                <q-btn
                  unelevated
                  color="positive"
                  icon="add"
                  label="เพิ่ม"
                  @click="handleAddMarker"
                />

                 <q-btn
                  outline
                  color="grey"
                  icon="refresh"
                  @click="handleResetForm"
                  round
                  dense
                >
                  <q-tooltip>ล้างค่า</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>

          <!-- Result Message -->
          <q-separator />
          <q-banner v-if="resultMessage" dense class="bg-blue-1 text-primary">
            <template v-slot:avatar>
              <q-icon name="info" color="primary" />
            </template>
            {{ resultMessage }}
          </q-banner>
        </q-card>

        <div class="row q-col-gutter-md">
          <!-- Map Container -->
          <div class="col-12 col-md-9 order-last order-md-first">
             <q-card class="shadow-2">
               <div ref="mapContainer" id="map" style="height: 600px; width: 100%;"></div>
               <q-card-section class="q-py-sm">
                 <div class="row items-center q-gutter-md text-caption text-grey-8">
                   <div class="flex items-center">
                     <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; margin-right: 6px;"></div>
                     ตำแหน่ง Marker
                   </div>
                   <div class="flex items-center">
                      <div style="width: 30px; height: 4px; border-radius: 2px; background: #2563eb; margin-right: 6px;"></div>
                     ข้อมูล Popup
                   </div>
                 </div>
               </q-card-section>
             </q-card>
          </div>

          <!-- Marker List -->
          <div class="col-12 col-md-3 order-first order-md-last">
            <q-card class="fit">
              <q-card-section>
                 <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  Marker List ({{ markerNames.length }})
                </div>
                <q-scroll-area style="height: 540px;">
                  <q-list separator class="rounded-borders">
                     <q-item v-if="markerNames.length === 0">
                      <q-item-section class="text-center text-grey text-italic">
                        ยังไม่มี Marker
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-for="name in markerNames"
                      :key="name"
                      clickable
                      v-ripple
                      @click="handleMarkerListClick(name)"
                    >
                      <q-item-section avatar min-width="0">
                        <q-icon name="place" color="green" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{ name }}</q-item-label>
                        <q-item-label caption class="text-xs">
                           {{ markerIndex[name].lat.toFixed(4) }}, {{ markerIndex[name].lng.toFixed(4) }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-scroll-area>
              </q-card-section>
            </q-card>
          </div>
        </div>

      </div>
    </div>
  </q-page>
</template>

<script>
import L from 'leaflet';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import { SHARED_LOCATIONS } from '../constants/locations';

export default {
  name: 'MapPresent',
  setup() {
    return {
      q: useQuasar()
    }
  },
  data() {
    return {
      placeName: '',
      lat: null,
      lng: null,
      address: '',
      isGeocoding: false,
      resultMessage: '',
      map: null,
      markersLayer: null,
      markerIndex: {},
      geocodeCache: {},
      greenIcon: null,
      initialLocations: SHARED_LOCATIONS,
    };
  },
  computed: {
    markerNames() {
      return Object.keys(this.markerIndex).sort();
    },
  },
  mounted() {
    this.loadGeocodeCache();
    this.loadLeafletCSS();
    this.$nextTick(async () => {
      this.initMap();

      // Load markers from Backend
      try {
        const response = await api.get('/api/markers');
        const markers = response.data;
        if (markers && markers.length > 0) {
          markers.forEach(loc => {
            this.addOrUpdateMarker(loc.name, loc.lat, loc.lng, false);
          });
        } else {
          // Fallback to initial
          this.initialLocations.forEach(loc => {
            this.addOrUpdateMarker(loc.name, loc.lat, loc.lng, false);
          });
        }
      } catch (error) {
        console.error('Failed to fetch markers:', error);
        this.initialLocations.forEach(loc => {
          this.addOrUpdateMarker(loc.name, loc.lat, loc.lng, false);
        });
      }
    });
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  },
  methods: {
    loadLeafletCSS() {
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    },
    initMap() {
      this.map = L.map(this.$refs.mapContainer).setView([18.8, 99.0], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.map);

      this.greenIcon = L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41],
      });

      this.markersLayer = L.layerGroup().addTo(this.map);

      // Click on map to get Lat/Lng
      this.map.on('click', (e) => {
        this.lat = Number(e.latlng.lat.toFixed(6));
        this.lng = Number(e.latlng.lng.toFixed(6));
        this.q.notify({
          color: 'info',
          message: `เลือกพิกัด: ${this.lat}, ${this.lng}`,
          icon: 'add_location',
          timeout: 1500,
          position: 'bottom-right'
        });
      });
    },
    addOrUpdateMarker(name, lat, lng, flyTo = false) {
      if (!name || isNaN(lat) || isNaN(lng)) return;

      const key = name.trim();
      const popupContent = L.DomUtil.create('div', 'popup-content');
      popupContent.innerHTML = `<strong>${key}</strong><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}<br>
        <button class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle text-negative q-focusable q-hoverable q-btn--dense mt-1"
                style="font-size: 11px; padding: 2px 4px;"
                id="popup-delete-${key}">
          <span class="q-btn__content">ลบตำแหน่ง</span>
        </button>`;

      const deleteBtn = popupContent.querySelector(`#popup-delete-${key}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.confirmDelete(key);
        });
      }

      if (this.markerIndex[key]) {
        this.markerIndex[key].marker.setLatLng([lat, lng]);
        this.markerIndex[key].marker.setPopupContent(popupContent);
        this.markerIndex[key].lat = lat;
        this.markerIndex[key].lng = lng;
      } else {
        const marker = L.marker([lat, lng], { icon: this.greenIcon }).addTo(
          this.markersLayer
        );
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          marker.openPopup();
        });
        // this.$set is Vue 2, Vue 3 doesn't need it for reactive objects usually, but if markerIndex is initialized in data() it is reactive.
        // However, adding new property to object in Vue 3 is reactive by default if object is reactive.
        this.markerIndex[key] = { marker, lat, lng };
      }

      this.fitMapToAllMarkers();

      if (flyTo) {
        this.map.flyTo([lat, lng], 17, { duration: 0.8 });
        this.markerIndex[key].marker.openPopup();
      }
    },
    fitMapToAllMarkers() {
      const markers = Object.values(this.markerIndex);
      if (markers.length === 0) return;

      const group = L.featureGroup(markers.map((m) => m.marker));
      if (markers.length === 1) {
        this.map.setView(group.getBounds().getCenter(), 17);
      } else {
        this.map.fitBounds(group.getBounds().pad(0.2));
      }
    },
    loadGeocodeCache() {
      try {
        const stored = localStorage.getItem('longan_geocode_cache');
        if (stored) this.geocodeCache = JSON.parse(stored) || {};
      } catch (e) {
        this.geocodeCache = {};
      }
    },
    async geocodeAddress(address) {
      if (!address) return null;

      if (this.geocodeCache[address]) {
        return this.geocodeCache[address];
      }

      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
        encodeURIComponent(address);

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Geocoding error');
      }

      const data = await res.json();
      if (!data || data.length === 0) return null;

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      this.geocodeCache[address] = { lat, lng };
      try {
        localStorage.setItem('longan_geocode_cache', JSON.stringify(this.geocodeCache));
      } catch (e) {
        // skip
      }

      return { lat, lng };
    },
    async handleGeocode() {
      const addr = this.address.trim();
      if (!addr) {
        this.q.notify({ type: 'warning', message: 'กรุณากรอกที่อยู่สำหรับ Geocoding' });
        return;
      }

      try {
        this.isGeocoding = true;
        const result = await this.geocodeAddress(addr);
        if (!result) {
          this.resultMessage = '❌ ไม่พบพิกัดจากที่อยู่นี้';
           this.q.notify({ type: 'negative', message: 'ไม่พบพิกัดจากที่อยู่นี้' });
        } else {
          this.lat = parseFloat(result.lat.toFixed(6));
          this.lng = parseFloat(result.lng.toFixed(6));
          this.resultMessage = `✅ พบพิกัด: ${this.lat}, ${this.lng}`;
          this.map.flyTo([result.lat, result.lng], 15, { duration: 0.8 });
        }
      } catch (err) {
        console.error(err);
        this.resultMessage = '❌ เกิดข้อผิดพลาดในการค้นหา';
        this.q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการค้นหา' });
      } finally {
        this.isGeocoding = false;
      }
    },
    async handleAddMarker() {
      const name = this.placeName.trim();

      if (!name || isNaN(this.lat) || isNaN(this.lng)) {
        this.q.notify({ type: 'warning', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        return;
      }

      try {
        await api.post('/api/markers', { name, lat: this.lat, lng: this.lng });
        this.addOrUpdateMarker(name, this.lat, this.lng, true);
        this.resultMessage = `✅ บันทึก Marker "${name}" สำเร็จ`;
        this.q.notify({ type: 'positive', message: `บันทึก Marker "${name}" สำเร็จ` });
        this.handleResetForm();
      } catch (error) {
        console.error('Error saving marker:', error);
        this.q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
      }
    },
    confirmDelete(name) {
      this.q.dialog({
        title: 'ยืนยันการลบ',
        message: `คุณต้องการลบตำแหน่ง "${name}" ใช่หรือไม่?`,
        cancel: true,
        persistent: true,
        ok: { flat: true, color: 'negative', label: 'ลบออก' }
      }).onOk(() => {
        this.handleDeleteMarker(name);
      });
    },
    async handleDeleteMarker(name) {
      try {
        await api.delete(`/api/markers/${encodeURIComponent(name)}`);
        if (this.markerIndex[name]) {
          this.markersLayer.removeLayer(this.markerIndex[name].marker);
          delete this.markerIndex[name];
        }
        this.fitMapToAllMarkers();
        this.q.notify({ type: 'positive', message: `ลบ "${name}" เรียบร้อยแล้ว` });
      } catch (error) {
        console.error('Error deleting marker:', error);
        this.q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
      }
    },
    handleResetForm() {
      this.placeName = '';
      this.lat = null;
      this.lng = null;
      this.address = '';
      this.resultMessage = '';
    },
    handleMarkerListClick(name) {
      const item = this.markerIndex[name];
      this.map.flyTo([item.lat, item.lng], 17, { duration: 0.7 });
      item.marker.openPopup();
      this.resultMessage = `🎯 ไปยัง "${name}"`;
    },
  },
};
</script>

<style scoped>
/* Leaflet Popup */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.popup-content) {
  padding: 4px;
  font-size: 0.85rem;
  line-height: 1.4;
}

:deep(.popup-content strong) {
  color: #1a202c;
}
</style>
