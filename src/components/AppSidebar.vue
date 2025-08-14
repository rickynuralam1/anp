<script setup>
import { RouterLink } from 'vue-router'
import { ref, onMounted } from 'vue'
import { logo } from '@/assets/brand/logo'
import { sygnet } from '@/assets/brand/sygnet'
import { AppSidebarNav } from '@/components/AppSidebarNav.js'
import { useSidebarStore } from '@/stores/sidebar.js'
import nav from '@/_nav.js'

const sidebar = useSidebarStore()
const role = ref('')
const filteredNav = ref([])

const updateMenu = () => {
  role.value = localStorage.getItem('role') || ''
  if (role.value === 'admin') {
    filteredNav.value = nav
  } else {
    filteredNav.value = nav.filter(
      item => item.name !== 'Configuration' && item.name !== 'User'
    )
  }
}

onMounted(() => {
  updateMenu()
  // Tambah event listener untuk reload menu kalau localStorage berubah
  window.addEventListener('storage', (e) => {
    if (e.key === 'role') {
      updateMenu()
    }
  })
})
</script>

<template>
  <CSidebar
    class="border-end"
    colorScheme="dark"
    position="fixed"
    :unfoldable="sidebar.unfoldable"
    :visible="sidebar.visible"
    @visible-change="(value) => sidebar.toggleVisible(value)"
  >
    <CSidebarHeader class="border-bottom">
      <RouterLink custom to="/" v-slot="{ href, navigate }">
        <CSidebarBrand v-bind="$attrs" as="a" :href="href" @click="navigate">
          <CIcon custom-class-name="sidebar-brand-full" :icon="logo" :height="32" />
          <CIcon custom-class-name="sidebar-brand-narrow" :icon="sygnet" :height="32" />
        </CSidebarBrand>
      </RouterLink>
      <CCloseButton class="d-lg-none" dark @click="sidebar.toggleVisible()" />
    </CSidebarHeader>

    <AppSidebarNav :items="filteredNav" />

    <CSidebarFooter class="border-top d-none d-lg-flex">
      <CSidebarToggler @click="sidebar.toggleUnfoldable()" />
    </CSidebarFooter>
  </CSidebar>
</template>
