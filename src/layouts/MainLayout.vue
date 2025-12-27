<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn v-if="isLoggedIn" flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="text-weight-bold uppercase tracking-wide">
          Varee Campus Safety
        </q-toolbar-title>

        <q-btn v-if="!isLoggedIn" flat icon="login" label="เข้าสู่ระบบ (Login)" @click="onLogin" />
        <q-btn v-else flat icon="logout" label="ออกจากระบบ (Logout)" @click="onLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer v-if="isLoggedIn" v-model="leftDrawerOpen" show-if-above bordered class="bg-grey-1">
      <q-list>
        <q-item-label header class="text-grey-8 text-weight-bold">
          เมนูการใช้งาน
        </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <div v-if="isLoggedIn">
        <router-view />
      </div>
      <div v-else class="fullscreen bg-white flex flex-center">
        <div class="text-center q-pa-md">
          <q-icon name="lock_person" size="140px" color="grey-2" class="q-mb-lg" />
          <div class="text-h4 text-weight-bolder text-primary q-mb-sm">Varee Campus Safety</div>
          <div class="text-h6 text-grey-7 q-mb-xl font-thin">โปรดเข้าสู่ระบบเพื่อเข้าใช้งานระบบนำทาง</div>

          <q-btn color="primary" label="เข้าสู่ระบบเดี๋ยวนี้" icon="login" size="lg" rounded unelevated padding="md xl"
            class="shadow-2" @click="onLogin" />

          <div class="fixed-bottom q-pb-xl text-grey-5 text-caption tracking-widest">
            © 2025 Varee Chiangmai School - Safety First
          </div>
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import EssentialLink from 'components/EssentialLink.vue'

const $q = useQuasar()
const $router = useRouter()

const isLoggedIn = ref(false)

onMounted(() => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
})

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

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function onLogin() {
  isLoggedIn.value = true
  localStorage.setItem('isLoggedIn', 'true')
  $q.notify({
    type: 'positive',
    message: 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับครับ',
    position: 'top',
    timeout: 1500
  })
}

function onLogout() {
  $q.dialog({
    title: 'ยืนยันการออกจากระบบ',
    message: 'เนื้อหาและเมนูทั้งหมดจะถูกซ่อน คุณต้องการดำเนินการต่อหรือไม่?',
    cancel: {
      flat: true,
      color: 'grey-7',
      label: 'ยกเลิก'
    },
    ok: {
      unelevated: true,
      color: 'primary',
      label: 'ออกจากระบบ',
      padding: 'sm lg'
    },
    persistent: true,
    class: 'custom-logout-dialog',
    headerClass: 'bg-primary text-white q-pa-md',
    style: 'border-radius: 12px; overflow: hidden;'
  }).onOk(() => {
    isLoggedIn.value = false
    localStorage.removeItem('isLoggedIn')
    $q.notify({
      color: 'grey-9',
      icon: 'logout',
      message: 'ออกจากระบบเรียบร้อยแล้ว',
      position: 'top',
      timeout: 1000
    })
  })
}
</script>

<style>
.custom-logout-dialog .q-dialog__title {
  background-color: var(--q-primary);
  color: white;
  padding: 16px;
  margin: -16px -16px 16px -16px;
  font-weight: bold;
}
</style>
