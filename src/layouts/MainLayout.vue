<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
          Essential Links
        </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'

const linksList = [
  {
    title: 'กำหนดสถานที่ปลอดภัย',
    caption: 'กำหนดสถานที่ไปยังจุดปลอดภัย',
    icon: 'home',
    link: '/'
  },
  {
    title: 'เส้นทางสั้นที่สุดไปจุดปลอดภัย',
    caption: 'การหาเส้นทางสั้นที่สุดไปจุดปลอดภัยภายในโรงเรียน',
    icon: 'map',
    link: '/shortest-path'
  },
  {
    title: 'นำทางบุคคลไปจุดปลอดภัย',
    caption: 'การนำทางบุคคลไปจุดปลอดภัยภายในโรงเรียน',
    icon: 'directions',
    link: '/tract-path'
  }
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
