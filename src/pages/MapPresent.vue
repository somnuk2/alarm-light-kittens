<template>
  <div class="page-wrapper">
    <div class="container">
      <h1>แผนที่ระบุตำแหน่งอาคาร (Northern Thailand)</h1>
      <p class="subtitle">โรงเรียนวารีเชียงใหม่ - การศึกษาเพื่ออนาคตก้าวไกล</p>

      <!-- Controls Section -->
      <div class="controls">
        <div class="control-group">
          <label>ชื่อสถานที่ / อาคาร</label>
          <input
            v-model="placeName"
            type="text"
            class="input-field"
            placeholder="เช่น อาคารที่ 1"
          />
        </div>

        <div class="control-group">
          <label>Latitude</label>
          <input
            v-model.number="lat"
            type="number"
            step="0.000001"
            class="input-field"
            placeholder="18.758769"
          />
        </div>

        <div class="control-group">
          <label>Longitude</label>
          <input
            v-model.number="lng"
            type="number"
            step="0.000001"
            class="input-field"
            placeholder="99.014645"
          />
        </div>

        <div class="control-group">
          <label>ที่อยู่ (Geocoding)</label>
          <input
            v-model="address"
            type="text"
            class="input-field"
            placeholder="เช่น โรงเรียนวารี"
          />
        </div>

        <button @click="handleGeocode" :disabled="isGeocoding" class="btn btn-primary">
          {{ isGeocoding ? 'กำลังค้นหา...' : 'ค้นหาพิกัด' }}
        </button>
        <button @click="handleAddMarker" class="btn btn-success">เพิ่ม Marker</button>
        <button @click="handleResetForm" class="btn btn-secondary">ล้างฟอร์ม</button>
      </div>

      <!-- Result Message -->
      <div class="result-box">
        <p v-if="resultMessage">{{ resultMessage }}</p>
        <p v-else>คลิกบนแผนที่ หรือใช้ฟอร์มเพื่อเพิ่ม Marker</p>
      </div>

      <!-- Map Container -->
      <div class="map-wrapper">
        <div ref="mapContainer" id="map" class="map-container"></div>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-marker"></div>
            <span>ตำแหน่ง Marker</span>
          </div>
          <div class="legend-item">
            <div class="legend-popup"></div>
            <span>ข้อมูลโดยเมาส์ชี้</span>
          </div>
        </div>
      </div>

      <!-- Marker List -->
      <div class="marker-list-section">
        <h3>รายการ Marker ที่มีอยู่ ({{ markerNames.length }})</h3>
        <div class="marker-list">
          <div v-if="markerNames.length === 0" class="empty-state">
            ยังไม่มี Marker
          </div>
          <button
            v-for="name in markerNames"
            :key="name"
            @click="handleMarkerListClick(name)"
            class="marker-item"
          >
            <span class="marker-name">{{ name }}</span>
            <span class="marker-coords">
              {{ markerIndex[name].lat.toFixed(4) }}, {{ markerIndex[name].lng.toFixed(4) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';

export default {
  name: 'MapPresent',
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
      initialLocations: [
        { name: 'อาคารที่ 1', lat: 18.758769, lng: 99.014645 },
        { name: 'อาคาร 2', lat: 18.758914, lng: 99.015257 },
        { name: 'อาคาร 3', lat: 18.758361, lng: 99.015129 },
        { name: 'อาคาร 4', lat: 18.757983, lng: 99.015512 },
        { name: 'อาคาร 5', lat: 18.758168, lng: 99.015763 },
        { name: 'อาคาร 6', lat: 18.757394, lng: 99.015381 },
        { name: 'อาคาร 7', lat: 18.75759, lng: 99.015905 },
        { name: 'futsal', lat: 18.757955, lng: 99.015097 },
        { name: 'สนามหญ้าจริง (safe zone)', lat: 18.757826, lng: 99.014679 },
        { name: 'สนามบาสเก็ดบอล', lat: 18.757833, lng: 99.015761 },
      ],
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
    this.$nextTick(() => {
      this.initMap();
      this.initialLocations.forEach((loc) =>
        this.addOrUpdateMarker(loc.name, loc.lat, loc.lng, false)
      );
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
    },
    addOrUpdateMarker(name, lat, lng, flyTo = false) {
      if (!name || isNaN(lat) || isNaN(lng)) return;

      const key = name.trim();
      const popupContent = `<div class="popup-content">
        <strong>${key}</strong><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}
      </div>`;

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
        this.$set(this.markerIndex, key, { marker, lat, lng });
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
        this.resultMessage = '⚠️ กรุณากรอกที่อยู่สำหรับ Geocoding';
        return;
      }

      try {
        this.isGeocoding = true;
        const result = await this.geocodeAddress(addr);
        if (!result) {
          this.resultMessage = '❌ ไม่พบพิกัดจากที่อยู่นี้';
        } else {
          this.lat = parseFloat(result.lat.toFixed(6));
          this.lng = parseFloat(result.lng.toFixed(6));
          this.resultMessage = `✅ พบพิกัด: ${this.lat}, ${this.lng}`;
          this.map.flyTo([result.lat, result.lng], 15, { duration: 0.8 });
        }
      } catch (err) {
        console.error(err);
        this.resultMessage = '❌ เกิดข้อผิดพลาดในการค้นหา';
      } finally {
        this.isGeocoding = false;
      }
    },
    handleAddMarker() {
      const name = this.placeName.trim();

      if (!name || isNaN(this.lat) || isNaN(this.lng)) {
        this.resultMessage = '⚠️ กรุณากรอกข้อมูลให้ครบถ้วน';
        return;
      }

      this.addOrUpdateMarker(name, this.lat, this.lng, true);
      this.resultMessage = `✅ เพิ่ม Marker "${name}" สำเร็จ`;
      this.handleResetForm();
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
  padding: 24px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

h1 {
  margin-top: 0;
  margin-bottom: 4px;
  font-size: 1.5rem;
  color: #1a202c;
}

.subtitle {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 0.95rem;
}

/* Controls */
.controls {
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

.input-field {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #c7d2e5;
  font-size: 0.9rem;
  background: #fff;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Buttons */
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

/* Result Box */
.result-box {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #1e40af;
}

.result-box p {
  margin: 0;
}

/* Map */
.map-wrapper {
  margin-top: 20px;
  padding: 16px;
  border-radius: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.map-container {
  height: 550px;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}

/* Legend */
.legend {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 0 4px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.legend-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-popup {
  width: 30px;
  height: 3px;
  border-radius: 999px;
  background: #2563eb;
}

/* Marker List */
.marker-list-section {
  margin-top: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.marker-list-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  color: #1a202c;
}

.marker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
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
  font-size: 0.8rem;
  color: #6b7280;
  margin-left: 8px;
  white-space: nowrap;
}

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
